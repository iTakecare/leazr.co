import Foundation
import SwiftUI
import Supabase
import UIKit

/// Toutes les actions du web sur une demande, regroupées.
///
/// Chacune passe par le même chemin que le web — edge function ou table — pour
/// qu'un dossier traité depuis le téléphone soit indiscernable d'un dossier
/// traité depuis le bureau.
@MainActor
enum OfferActions {

    // MARK: - PDF

    struct GeneratedPDF {
        let fileName: String
        let url: URL
    }

    private struct PDFResponse: Decodable {
        let success: Bool?
        let fileName: String?
        let pdfBase64: String?
        let error: String?
    }

    /// Génère le PDF par l'edge function `generate-offer-pdf` et l'écrit dans
    /// un fichier temporaire, prêt à être partagé ou visualisé.
    ///
    /// La génération est serveur : le moteur historique rend un composant React
    /// dans un navigateur, ce qu'aucune application native ne peut faire.
    static func generatePDF(offerId: String) async throws -> GeneratedPDF {
        let response: PDFResponse = try await Backend.client.functions.invoke(
            "generate-offer-pdf",
            options: FunctionInvokeOptions(body: ["offerId": AnyJSON.string(offerId)])
        )

        guard response.success == true,
              let base64 = response.pdfBase64,
              let data = Data(base64Encoded: base64)
        else {
            throw ActionError.message(response.error ?? "Le PDF n'a pas pu être généré.")
        }

        let name = response.fileName ?? "Offre.pdf"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
        try data.write(to: url, options: .atomic)
        return GeneratedPDF(fileName: name, url: url)
    }

    // MARK: - Liens publics

    /// Page de consultation et de signature côté client.
    static func publicLink(offerId: String) -> URL? {
        URL(string: "https://app.leazr.co/client/offer/\(offerId)/sign")
    }

    /// Lien de dépôt de documents. On réutilise un lien encore valide plutôt
    /// que d'en créer un nouveau à chaque fois, comme le fait le web.
    static func uploadLink(offerId: String, documents: [String]) async throws -> URL {
        struct Link: Decodable {
            let token: String
            let expiresAt: Date?

            enum CodingKeys: String, CodingKey {
                case token
                case expiresAt = "expires_at"
            }

            init(from decoder: Decoder) throws {
                let c = try decoder.container(keyedBy: CodingKeys.self)
                token = try c.decode(String.self, forKey: .token)
                if let raw = try c.decodeIfPresent(String.self, forKey: .expiresAt) {
                    expiresAt = Format.parseDate(raw)
                } else { expiresAt = nil }
            }
        }

        let existing: [Link] = (try? await Backend.client
            .from("offer_upload_links")
            .select("token, expires_at")
            .eq("offer_id", value: offerId)
            .order("created_at", ascending: false)
            .limit(1)
            .execute().value) ?? []

        if let link = existing.first, (link.expiresAt ?? .distantPast) > Date() {
            return try url(forUploadToken: link.token)
        }

        // Sept jours de validité, comme `createUploadLink`.
        let token = UUID().uuidString
        let expires = Calendar.current.date(byAdding: .day, value: 7, to: Date()) ?? Date()

        try await Backend.client
            .from("offer_upload_links")
            .insert([
                "offer_id": AnyJSON.string(offerId),
                "token": .string(token),
                "requested_documents": .array(documents.map { .string($0) }),
                "custom_message": .string("Lien généré depuis l'application"),
                "expires_at": .string(ISO8601DateFormatter.leazrTimestamp.string(from: expires)),
                "created_by": Session.shared.userId.map(AnyJSON.string) ?? .null,
            ])
            .execute()

        return try url(forUploadToken: token)
    }

    private static func url(forUploadToken token: String) throws -> URL {
        guard let url = URL(string: "https://app.leazr.co/offer/documents/upload/\(token)") else {
            throw ActionError.message("Lien invalide.")
        }
        return url
    }

    // MARK: - Envois

    private struct GenericResponse: Decodable {
        let success: Bool?
        let error: String?
        let message: String?
    }

    /// Envoie l'offre au client avec son PDF, via `send-offer-email`.
    static func sendOfferEmail(
        offerId: String,
        to recipient: String,
        subject: String,
        message: String,
        includePDF: Bool
    ) async throws {
        var body: [String: AnyJSON] = [
            "offerId": .string(offerId),
            "to": .string(recipient),
            "subject": .string(subject),
            "message": .string(message),
        ]

        if includePDF {
            let response: PDFResponse = try await Backend.client.functions.invoke(
                "generate-offer-pdf",
                options: FunctionInvokeOptions(body: ["offerId": AnyJSON.string(offerId)])
            )
            if let base64 = response.pdfBase64 {
                body["pdfBase64"] = .string(base64)
                body["pdfFilename"] = .string(response.fileName ?? "offre.pdf")
            }
        }

        let response: GenericResponse = try await Backend.client.functions.invoke(
            "send-offer-email",
            options: FunctionInvokeOptions(body: body)
        )
        if let error = response.error { throw ActionError.message(error) }

        // Le web fait passer la demande en « envoyée » après l'envoi réussi.
        await markSentIfDraft(offerId: offerId)
        logEvent(offerId: offerId, type: "email_offer", description: "Offre envoyée par e-mail à \(recipient)")
    }

    private static func markSentIfDraft(offerId: String) async {
        struct Row: Decodable { let workflowStatus: String?
            enum CodingKeys: String, CodingKey { case workflowStatus = "workflow_status" } }
        let rows: [Row] = (try? await Backend.client
            .from("offers").select("workflow_status").eq("id", value: offerId).limit(1)
            .execute().value) ?? []
        guard rows.first?.workflowStatus == "draft" else { return }
        _ = await OfferStatusService.update(
            offerId: offerId,
            to: "sent",
            from: "draft",
            reason: "Offre envoyée par e-mail depuis l'application"
        )
    }

    /// Relance client, via `send-reminder-email`. Le gabarit, la langue et la
    /// mise en page restent côté serveur.
    static func sendReminder(
        offerId: String,
        type: String,
        level: Int,
        language: String,
        customMessage: String?,
        includePDF: Bool
    ) async throws {
        var body: [String: AnyJSON] = [
            "offerId": .string(offerId),
            "reminderType": .string(type),
            "reminderLevel": .integer(level),
            "language": .string(language),
        ]
        if let customMessage, !customMessage.isEmpty {
            body["customMessage"] = .string(customMessage)
        }
        if includePDF, let pdf = try? await generatePDF(offerId: offerId),
           let data = try? Data(contentsOf: pdf.url) {
            body["pdfBase64"] = .string(data.base64EncodedString())
            body["pdfFilename"] = .string(pdf.fileName)
        }

        let response: GenericResponse = try await Backend.client.functions.invoke(
            "send-reminder-email",
            options: FunctionInvokeOptions(body: body)
        )
        if response.success != true {
            throw ActionError.message(response.error ?? "Envoi du rappel impossible.")
        }
    }

    // MARK: - Duplication

    /// Champs recopiés à l'identique, repris de `FIELDS_TO_CLONE`. Tout ce qui
    /// est propre au cycle de vie du dossier (scores, signature, commission)
    /// est volontairement remis à zéro.
    private static let clonedFields = [
        "ambassador_id", "amount", "annual_insurance", "billing_entity_id", "business_sector",
        "client_email", "client_id", "client_name", "coefficient", "commission", "company_id",
        "contract_duration", "contract_terms", "discount_amount", "discount_type", "discount_value",
        "down_payment", "duration", "equipment_description", "estimated_budget", "file_fee",
        "financed_amount", "is_purchase", "leaser_id", "margin", "margin_difference",
        "monthly_payment", "monthly_payment_before_discount", "pack_id", "partner_name",
        "partner_slug", "products_to_be_determined", "remarks", "source",
        "total_margin_with_difference", "type", "user_id", "workflow_template_id",
    ]

    struct Clone {
        let offerId: String
        let dossierNumber: String?
    }

    static func duplicate(offerId: String) async throws -> Clone {
        struct Inserted: Decodable {
            let id: String
            let dossierNumber: String?
            enum CodingKeys: String, CodingKey { case id; case dossierNumber = "dossier_number" }
        }

        let originals: [[String: AnyJSON]] = try await Backend.client
            .from("offers")
            .select("*")
            .eq("id", value: offerId)
            .limit(1)
            .execute()
            .value
        guard let original = originals.first else {
            throw ActionError.message("Demande introuvable.")
        }

        var cloned: [String: AnyJSON] = [:]
        for field in clonedFields {
            cloned[field] = original[field] ?? .null
        }
        cloned["previous_offer_id"] = .string(offerId)
        cloned["workflow_status"] = .string("draft")
        cloned["status"] = .string("draft")
        for reset in [
            "internal_score", "leaser_score", "rejection_category", "signature_data",
            "signed_at", "signer_ip", "signer_name", "commission_paid_at",
            "commission_status", "leaser_request_number",
        ] {
            cloned[reset] = .null
        }
        cloned["converted_to_contract"] = .bool(false)

        let year = Calendar.current.component(.year, from: Date())
        let stamp = String(Int(Date().timeIntervalSince1970)).suffix(4)
        cloned["dossier_number"] = .string("ITC-\(year)-OFF-\(stamp)")

        let inserted: [Inserted] = try await Backend.client
            .from("offers")
            .insert(cloned)
            .select("id, dossier_number")
            .execute()
            .value
        guard let newOffer = inserted.first else {
            throw ActionError.message("Duplication impossible.")
        }

        await copyEquipment(from: offerId, to: newOffer.id)
        return Clone(offerId: newOffer.id, dossierNumber: newOffer.dossierNumber)
    }

    private static let clonedEquipmentFields = [
        "coefficient", "collaborator_id", "custom_pack_id", "delivery_address", "delivery_city",
        "delivery_contact_email", "delivery_contact_name", "delivery_contact_phone",
        "delivery_country", "delivery_postal_code", "delivery_site_id", "delivery_type",
        "is_gifted", "margin", "monthly_payment", "purchase_price", "quantity", "selling_price",
        "serial_number", "title",
    ]

    private static func copyEquipment(from source: String, to target: String) async {
        struct Row: Decodable { let id: String }

        let originals: [[String: AnyJSON]] = (try? await Backend.client
            .from("offer_equipment")
            .select("*")
            .eq("offer_id", value: source)
            .execute().value) ?? []
        guard !originals.isEmpty else { return }

        for original in originals {
            var row: [String: AnyJSON] = ["offer_id": .string(target)]
            for field in clonedEquipmentFields {
                row[field] = original[field] ?? .null
            }

            let inserted: [Row] = (try? await Backend.client
                .from("offer_equipment")
                .insert(row)
                .select("id")
                .execute().value) ?? []
            guard let newId = inserted.first?.id,
                  case let .string(oldId)? = original["id"] else { continue }

            for table in ["offer_equipment_attributes", "offer_equipment_specifications"] {
                struct KeyValue: Decodable { let key: String; let value: String }
                let rows: [KeyValue] = (try? await Backend.client
                    .from(table)
                    .select("key, value")
                    .eq("equipment_id", value: oldId)
                    .execute().value) ?? []
                guard !rows.isEmpty else { continue }
                _ = try? await Backend.client
                    .from(table)
                    .insert(rows.map {
                        [
                            "equipment_id": AnyJSON.string(newId),
                            "key": .string($0.key),
                            "value": .string($0.value),
                        ]
                    })
                    .execute()
            }
        }
    }

    // MARK: - Suppression

    /// Supprime une demande, après avoir relibéré le matériel qu'elle
    /// réservait — sinon le stock reste bloqué sur un dossier disparu.
    static func delete(offerId: String) async throws {
        _ = await OfferStatusService.releaseReservedStock(offerId: offerId)
        try await Backend.client
            .from("offers")
            .delete()
            .eq("id", value: offerId)
            .execute()
    }

    // MARK: - Divers

    static func updateDate(offerId: String, to date: Date) async throws {
        try await Backend.client
            .from("offers")
            .update(["created_at": ISO8601DateFormatter.leazrTimestamp.string(from: date)])
            .eq("id", value: offerId)
            .execute()
    }

    /// Journalise un événement métier sur la demande, comme `logOfferEvent`.
    static func logEvent(offerId: String, type: String, description: String) {
        Task {
            _ = try? await Backend.client
                .from("offer_events")
                .insert([
                    "offer_id": AnyJSON.string(offerId),
                    "event_type": .string(type),
                    "description": .string(description),
                    "user_id": Session.shared.userId.map(AnyJSON.string) ?? .null,
                ])
                .execute()
        }
    }

    enum ActionError: LocalizedError {
        case message(String)
        var errorDescription: String? {
            switch self { case .message(let text): return text }
        }
    }
}
