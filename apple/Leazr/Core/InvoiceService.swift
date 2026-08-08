import Foundation
import SwiftUI
import Supabase

/// Opérations sur les factures et notes de crédit, portage de
/// `invoiceService.ts` et `creditNoteService.ts`.
@MainActor
enum InvoiceService {

    // MARK: - Lecture

    static func invoices(companyId: String) async -> [InvoiceDetail] {
        (try? await Backend.client
            .from("invoices")
            .select(InvoiceDetail.columns)
            .eq("company_id", value: companyId)
            .order("created_at", ascending: false)
            .limit(500)
            .execute().value) ?? []
    }

    static func invoice(id: String) async -> InvoiceDetail? {
        let rows: [InvoiceDetail] = (try? await Backend.client
            .from("invoices")
            .select(InvoiceDetail.columns)
            .eq("id", value: id)
            .limit(1)
            .execute().value) ?? []
        return rows.first
    }

    static func creditNotes(companyId: String) async -> [CreditNote] {
        (try? await Backend.client
            .from("credit_notes")
            .select(CreditNote.columns)
            .eq("company_id", value: companyId)
            .order("created_at", ascending: false)
            .execute().value) ?? []
    }

    // MARK: - Écriture

    static func patch(invoiceId: String, _ values: [String: AnyJSON]) async -> Bool {
        var payload = values
        payload["updated_at"] = .string(ISO8601DateFormatter.leazrTimestamp.string(from: Date()))
        do {
            try await Backend.client
                .from("invoices")
                .update(payload)
                .eq("id", value: invoiceId)
                .execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    /// Marquer payée pose aussi la date d'encaissement : sans elle, le rapport
    /// comptable ne saurait pas à quelle année rattacher la recette.
    static func setStatus(invoiceId: String, to status: String, paidAt: Date?) async -> Bool {
        var payload: [String: AnyJSON] = ["status": .string(status)]
        if status == "paid" {
            payload["paid_at"] = .string(
                ISO8601DateFormatter.leazrTimestamp.string(from: paidAt ?? Date())
            )
        }
        if status == "sent" {
            payload["sent_at"] = .string(ISO8601DateFormatter.leazrTimestamp.string(from: Date()))
        }
        return await patch(invoiceId: invoiceId, payload)
    }

    static func delete(invoiceId: String) async -> Bool {
        do {
            try await Backend.client
                .from("invoices")
                .delete()
                .eq("id", value: invoiceId)
                .execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    // MARK: - Création

    struct NewInvoice {
        var type: String
        var clientName: String
        var clientId: String?
        var amount: Double
        var description: String
        var invoiceDate: Date
        var dueDate: Date?
    }

    /// Crée une facture manuelle. Le numéro suit la convention du web :
    /// `FAC-<année>-<horodatage>`, et `billing_data` porte le client et la
    /// ligne unique, comme le fait `NewInvoiceDialog`.
    static func create(companyId: String, _ input: NewInvoice) async -> String? {
        struct Row: Decodable { let id: String }

        let year = Calendar.current.component(.year, from: Date())
        let stamp = String(Int(Date().timeIntervalSince1970)).suffix(6)
        let number = "FAC-\(year)-\(stamp)"

        var client: [String: AnyJSON] = ["name": .string(input.clientName)]
        if let clientId = input.clientId { client["id"] = .string(clientId) }

        let billing: [String: AnyJSON] = [
            "client_data": .object(client),
            "description": .string(input.description),
            "equipment_data": .array([
                .object([
                    "title": .string(input.description.isEmpty ? input.clientName : input.description),
                    "quantity": .integer(1),
                    "purchase_price": .double(input.amount),
                    "selling_price": .double(input.amount),
                ])
            ]),
        ]

        var payload: [String: AnyJSON] = [
            "company_id": .string(companyId),
            "invoice_number": .string(number),
            "invoice_type": .string(input.type),
            "leaser_name": .string(input.clientName),
            "amount": .double(input.amount),
            "status": .string("draft"),
            "integration_type": .string("manual"),
            "invoice_date": .string(ISO8601DateFormatter.leazrTimestamp.string(from: input.invoiceDate)),
            "billing_data": .object(billing),
        ]
        payload["due_date"] = input.dueDate
            .map { AnyJSON.string(ISO8601DateFormatter.leazrTimestamp.string(from: $0)) } ?? .null

        do {
            let created: [Row] = try await Backend.client
                .from("invoices")
                .insert(payload)
                .select("id")
                .execute()
                .value
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return created.first?.id
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return nil
        }
    }

    // MARK: - Notes de crédit

    /// Crée une note de crédit et répercute ses effets, comme le web :
    /// la facture passe en « créditée » ou « crédit partiel », et le contrat
    /// rattaché est annulé — c'est ce dernier point qu'on oublie facilement.
    static func createCreditNote(
        companyId: String,
        invoice: InvoiceDetail,
        amount: Double,
        reason: String
    ) async -> Bool {
        struct Row: Decodable { let id: String }

        let number: String? = try? await Backend.client
            .rpc("generate_credit_note_number", params: ["p_company_id": companyId])
            .execute()
            .value

        do {
            let created: [Row] = try await Backend.client
                .from("credit_notes")
                .insert([
                    "company_id": AnyJSON.string(companyId),
                    "invoice_id": .string(invoice.id),
                    "credit_note_number": number.map(AnyJSON.string) ?? .null,
                    "amount": .double(amount),
                    "reason": .string(reason),
                    "status": .string("applied"),
                    "issued_at": .string(ISO8601DateFormatter.leazrTimestamp.string(from: Date())),
                ])
                .select("id")
                .execute()
                .value

            guard let creditNote = created.first else { return false }

            _ = await patch(invoiceId: invoice.id, [
                "credited_amount": .double(amount),
                "credit_note_id": .string(creditNote.id),
                "status": .string(amount >= invoice.amount ? "credited" : "partial_credit"),
            ])

            if let contractId = invoice.contractId {
                _ = try? await Backend.client
                    .from("contracts")
                    .update([
                        "status": AnyJSON.string("cancelled"),
                        "updated_at": .string(ISO8601DateFormatter.leazrTimestamp.string(from: Date())),
                    ])
                    .eq("id", value: contractId)
                    .execute()
            }

            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    /// Supprime une note de crédit et remet la facture dans son état d'origine.
    static func deleteCreditNote(_ note: CreditNote) async -> Bool {
        do {
            try await Backend.client
                .from("credit_notes")
                .delete()
                .eq("id", value: note.id)
                .execute()

            _ = await patch(invoiceId: note.invoiceId, [
                "credited_amount": .double(0),
                "credit_note_id": .null,
                "status": .string("sent"),
            ])
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    // MARK: - Rapport comptable

    /// Agrège par année fiscale. Les factures sont rattachées à leur date de
    /// facture, les notes de crédit à leur date d'émission — deux années
    /// différentes pour un même dossier, et c'est voulu.
    static func accountingReport(companyId: String) async -> [FiscalYearReport] {
        struct InvoiceRow: Decodable {
            let amount: Double?
            let status: String?
            let creditedAmount: Double?
            let invoiceDate: String?
            let createdAt: String?

            enum CodingKeys: String, CodingKey {
                case amount, status
                case creditedAmount = "credited_amount"
                case invoiceDate = "invoice_date"
                case createdAt = "created_at"
            }
        }

        struct CreditRow: Decodable {
            let amount: Double?
            let issuedAt: String?
            enum CodingKeys: String, CodingKey {
                case amount
                case issuedAt = "issued_at"
            }
        }

        let invoices: [InvoiceRow] = (try? await Backend.client
            .from("invoices")
            .select("amount, status, credited_amount, invoice_date, created_at")
            .eq("company_id", value: companyId)
            .execute().value) ?? []

        let credits: [CreditRow] = (try? await Backend.client
            .from("credit_notes")
            .select("amount, issued_at")
            .eq("company_id", value: companyId)
            .execute().value) ?? []

        var byYear: [Int: FiscalYearReport] = [:]
        let calendar = Calendar.current

        for row in invoices {
            let reference = row.invoiceDate ?? row.createdAt
            guard let date = reference.flatMap(Format.parseDate) else { continue }
            let year = calendar.component(.year, from: date)
            var report = byYear[year] ?? FiscalYearReport(year: year)

            let amount = row.amount ?? 0
            report.invoiceTotal += amount
            report.invoiceCount += 1

            if row.status == "credited" || (row.creditedAmount ?? 0) > 0 {
                report.credited += (row.creditedAmount ?? amount)
                report.creditedCount += 1
            } else if row.status == "paid" {
                report.paid += amount
                report.paidCount += 1
            } else {
                report.unpaid += amount
                report.unpaidCount += 1
            }

            byYear[year] = report
        }

        for row in credits {
            guard let date = row.issuedAt.flatMap(Format.parseDate) else { continue }
            let year = calendar.component(.year, from: date)
            var report = byYear[year] ?? FiscalYearReport(year: year)
            report.creditNoteTotal += row.amount ?? 0
            report.creditNoteCount += 1
            byYear[year] = report
        }

        return byYear.values.sorted { $0.year > $1.year }
    }

    // MARK: - Billit

    struct BillitState: Sendable {
        let isEnabled: Bool
    }

    static func billitIntegration(companyId: String) async -> BillitState {
        struct Row: Decodable {
            let isEnabled: Bool?
            enum CodingKeys: String, CodingKey { case isEnabled = "is_enabled" }
        }
        let rows: [Row] = (try? await Backend.client
            .from("company_integrations")
            .select("is_enabled")
            .eq("company_id", value: companyId)
            .eq("integration_type", value: "billit")
            .limit(1)
            .execute().value) ?? []
        return BillitState(isEnabled: rows.first?.isEnabled ?? false)
    }

    private struct FunctionResult: Decodable {
        let success: Bool?
        let error: String?
        let message: String?
        let imported: Int?
        let updated: Int?
    }

    struct BillitOutcome {
        let success: Bool
        let detail: String
    }

    private static func invokeBillit(
        _ name: String,
        body: [String: AnyJSON]
    ) async -> BillitOutcome {
        do {
            let result: FunctionResult = try await Backend.client.functions.invoke(
                name,
                options: FunctionInvokeOptions(body: body)
            )
            if result.success == true {
                var parts: [String] = []
                if let imported = result.imported { parts.append("\(imported) importée(s)") }
                if let updated = result.updated { parts.append("\(updated) mise(s) à jour") }
                if let message = result.message, parts.isEmpty { parts.append(message) }
                return BillitOutcome(success: true, detail: parts.joined(separator: ", "))
            }
            return BillitOutcome(success: false, detail: result.error ?? result.message ?? "Échec")
        } catch {
            return BillitOutcome(success: false, detail: "Appel impossible.")
        }
    }

    static func syncBillitStatuses(companyId: String) async -> BillitOutcome {
        await invokeBillit("billit-sync-status", body: ["companyId": .string(companyId)])
    }

    static func importBillitSales(companyId: String, from date: Date?) async -> BillitOutcome {
        var body: [String: AnyJSON] = ["companyId": .string(companyId)]
        if let date { body["fromDate"] = .string(Format.day(date)) }
        return await invokeBillit("billit-import-invoices", body: body)
    }

    static func importBillitCreditNotes(companyId: String, from date: Date?) async -> BillitOutcome {
        var body: [String: AnyJSON] = ["companyId": .string(companyId)]
        if let date { body["fromDate"] = .string(Format.day(date)) }
        return await invokeBillit("billit-import-credit-notes", body: body)
    }

    static func importBillitPurchases(companyId: String, from date: Date?) async -> BillitOutcome {
        var body: [String: AnyJSON] = ["companyId": .string(companyId)]
        if let date { body["fromDate"] = .string(Format.day(date)) }
        return await invokeBillit("billit-import-purchase-invoices", body: body)
    }

    static func sendToBillit(invoiceId: String) async -> BillitOutcome {
        await invokeBillit("billit-invoice", body: ["invoiceId": .string(invoiceId)])
    }

    // MARK: - Envoi au bailleur

    /// Transmet la facture et ses pièces au bailleur, via la même edge
    /// function que le web. Les gabarits et la mise en page restent serveur.
    static func sendToLeaser(
        invoice: InvoiceDetail,
        leaserEmail: String,
        ccEmails: [String],
        documentIds: [String],
        message: String?,
        previewOnly: Bool
    ) async -> BillitOutcome {
        var info: [String: AnyJSON] = [
            "invoice_number": invoice.invoiceNumber.map(AnyJSON.string) ?? .null,
            "client_name": .string(invoice.clientName),
            "amount": .double(invoice.amount),
        ]
        if let dossier = invoice.billing?.offer?.dossierNumber {
            info["dossier_number"] = .string(dossier)
        }

        var body: [String: AnyJSON] = [
            "invoice_id": .string(invoice.id),
            "leaser_email": .string(leaserEmail),
            "leaser_name": .string(invoice.leaserName),
            "cc_emails": .array(ccEmails.map { .string($0) }),
            "document_ids": .array(documentIds.map { .string($0) }),
            "additional_files": .array([]),
            "invoice_info": .object(info),
            "preview_only": .bool(previewOnly),
        ]
        if let message, !message.isEmpty {
            body["custom_message"] = .string(message)
        }

        return await invokeBillit("send-leaser-documents", body: body)
    }

    /// Documents rattachés au contrat de la facture : ce sont eux qu'on
    /// transmet au bailleur avec la facture.
    static func contractDocuments(contractId: String?) async -> [ContractDocument] {
        guard let contractId else { return [] }
        return await ContractService.documents(contractId: contractId)
    }
}
