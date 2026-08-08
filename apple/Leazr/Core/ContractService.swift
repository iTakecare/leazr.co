import Foundation
import SwiftUI
import Supabase

/// Opérations sur un contrat, portage de `contractService.ts`.
@MainActor
enum ContractService {

    // MARK: - Statut

    /// Change le statut et journalise. Le web tente d'abord la RPC dédiée puis
    /// retombe sur une insertion directe : on garde les deux chemins, la RPC
    /// n'étant pas déployée partout.
    static func updateStatus(
        contractId: String,
        to newStatus: String,
        from previousStatus: String,
        reason: String?
    ) async -> Bool {
        do {
            try await Backend.client
                .from("contracts")
                .update([
                    "status": AnyJSON.string(newStatus),
                    "updated_at": .string(ISO8601DateFormatter.leazrTimestamp.string(from: Date())),
                ])
                .eq("id", value: contractId)
                .execute()
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }

        await log(
            contractId: contractId,
            previous: previousStatus,
            new: newStatus,
            reason: reason
        )
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        return true
    }

    private static func log(
        contractId: String,
        previous: String,
        new: String,
        reason: String?
    ) async {
        do {
            try await Backend.client
                .rpc("create_contract_workflow_log", params: [
                    "p_contract_id": AnyJSON.string(contractId),
                    "p_previous_status": .string(previous),
                    "p_new_status": .string(new),
                    "p_reason": reason.map(AnyJSON.string) ?? .null,
                ])
                .execute()
        } catch {
            // La RPC n'existe pas partout : l'insertion directe fait le même
            // travail, un journal manquant ne doit pas annuler la transition.
            _ = try? await Backend.client
                .from("contract_workflow_logs")
                .insert([
                    "contract_id": AnyJSON.string(contractId),
                    "user_id": Session.shared.userId.map(AnyJSON.string) ?? .null,
                    "previous_status": .string(previous),
                    "new_status": .string(new),
                    "reason": reason.map(AnyJSON.string) ?? .null,
                    "user_name": .string("Application iOS"),
                ])
                .execute()
        }
    }

    static func logs(contractId: String) async -> [ContractLog] {
        (try? await Backend.client
            .from("contract_workflow_logs")
            .select(ContractLog.columns)
            .eq("contract_id", value: contractId)
            .order("created_at", ascending: false)
            .limit(50)
            .execute().value) ?? []
    }

    // MARK: - Suivi de livraison

    static func setTracking(
        contractId: String,
        number: String,
        carrier: String?,
        estimatedDelivery: Date?
    ) async -> Bool {
        do {
            var payload: [String: AnyJSON] = [
                "tracking_number": .string(number),
                "delivery_status": .string("en_attente"),
                "updated_at": .string(ISO8601DateFormatter.leazrTimestamp.string(from: Date())),
            ]
            payload["delivery_carrier"] = carrier.map(AnyJSON.string) ?? .null
            payload["estimated_delivery"] = estimatedDelivery
                .map { AnyJSON.string(Format.day($0)) } ?? .null

            try await Backend.client
                .from("contracts")
                .update(payload)
                .eq("id", value: contractId)
                .execute()

            await log(
                contractId: contractId,
                previous: "equipment_ordered",
                new: "equipment_ordered",
                reason: "Numéro de suivi ajouté : \(number)"
                    + (carrier.map { " (\($0))" } ?? "")
            )
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    // MARK: - Champs simples

    /// Écriture générique d'un lot de colonnes, avec horodatage de mise à jour.
    static func patch(contractId: String, _ values: [String: AnyJSON]) async -> Bool {
        var payload = values
        payload["updated_at"] = .string(ISO8601DateFormatter.leazrTimestamp.string(from: Date()))
        do {
            try await Backend.client
                .from("contracts")
                .update(payload)
                .eq("id", value: contractId)
                .execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    // MARK: - Dates

    /// Règle de démarrage du bailleur, qui déduit la date de début de la date
    /// de livraison. Sans elle, une livraison saisie ne déclencherait rien.
    static func startRule(leaserId: String?) async -> ContractStartRule {
        guard let leaserId else { return .nextMonthFirst }

        struct Row: Decodable {
            let rule: String?
            enum CodingKeys: String, CodingKey { case rule = "contract_start_rule" }
        }
        let rows: [Row] = (try? await Backend.client
            .from("leasers")
            .select("contract_start_rule")
            .eq("id", value: leaserId)
            .limit(1)
            .execute().value) ?? []

        return rows.first?.rule.flatMap(ContractStartRule.init) ?? .nextMonthFirst
    }

    /// Enregistre la livraison et recalcule la date de début selon la règle.
    static func setDeliveryDate(
        contractId: String,
        date: Date,
        rule: ContractStartRule
    ) async -> Date? {
        var payload: [String: AnyJSON] = ["delivery_date": .string(Format.day(date))]
        let start = rule.startDate(from: date)
        if let start {
            payload["contract_start_date"] = .string(Format.day(start))
        }
        return await patch(contractId: contractId, payload) ? start : nil
    }

    // MARK: - Équipements

    static func equipment(contractId: String) async -> [ContractEquipment] {
        (try? await Backend.client
            .from("contract_equipment")
            .select(ContractEquipment.columns)
            .eq("contract_id", value: contractId)
            .order("created_at", ascending: true)
            .execute().value) ?? []
    }

    /// Enregistre les numéros de série d'une ligne. Ils sont concaténés par
    /// des virgules, un par unité, comme le fait le gestionnaire web.
    static func setSerialNumbers(
        equipmentId: String,
        serials: [String],
        notSerializable: Bool
    ) async -> Bool {
        let joined = serials
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .joined(separator: ", ")

        do {
            try await Backend.client
                .from("contract_equipment")
                .update([
                    "serial_number": joined.isEmpty ? AnyJSON.null : .string(joined),
                    "not_serializable": .bool(notSerializable),
                ])
                .eq("id", value: equipmentId)
                .execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    static func updateOrder(
        equipmentId: String,
        _ values: [String: AnyJSON]
    ) async -> Bool {
        do {
            try await Backend.client
                .from("contract_equipment")
                .update(values)
                .eq("id", value: equipmentId)
                .execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    static func suppliers(companyId: String) async -> [Supplier] {
        (try? await Backend.client
            .from("suppliers")
            .select("id, name")
            .eq("company_id", value: companyId)
            .order("name", ascending: true)
            .execute().value) ?? []
    }

    struct Supplier: Decodable, Identifiable, Sendable {
        let id: String
        let name: String
    }

    // MARK: - Rachat de fin de contrat

    /// Rachète une ligne d'équipement et la fait entrer en stock, exactement
    /// comme `buyBackContractEquipment` : création de l'article, mouvement
    /// tracé, puis marquage de la ligne de contrat.
    static func buyBack(
        companyId: String,
        contractId: String,
        equipment: ContractEquipment,
        price: Double,
        condition: String,
        notes: String?
    ) async -> Bool {
        struct Row: Decodable { let id: String }
        let today = Format.day(Date())

        do {
            let created: [Row] = try await Backend.client
                .from("stock_items")
                .insert([
                    "company_id": AnyJSON.string(companyId),
                    "title": .string(equipment.title),
                    "serial_number": equipment.serialNumber.map(AnyJSON.string) ?? .null,
                    "status": .string("in_stock"),
                    "condition": .string(condition),
                    "purchase_price": .double(price),
                    "unit_price": .double(price),
                    "quantity": .integer(1),
                    "source": .string("contract_buyback"),
                    "buyback_price": .double(price),
                    "source_contract_id": .string(contractId),
                    "source_contract_equipment_id": .string(equipment.id),
                    "purchase_date": .string(today),
                    "reception_date": .string(today),
                    "notes": notes.map(AnyJSON.string) ?? .null,
                ])
                .select("id")
                .execute()
                .value

            guard let item = created.first else { return false }

            _ = try? await Backend.client
                .from("stock_movements")
                .insert([
                    "company_id": AnyJSON.string(companyId),
                    "stock_item_id": .string(item.id),
                    "movement_type": .string("contract_buyback"),
                    "to_status": .string("in_stock"),
                    "contract_id": .string(contractId),
                    "cost": .double(price),
                    "performed_by": Session.shared.userId.map(AnyJSON.string) ?? .null,
                    "notes": .string("Reprise contrat — rachat \(Format.currency(price))"),
                ])
                .execute()

            try await Backend.client
                .from("contract_equipment")
                .update([
                    "bought_back_at": AnyJSON.string(ISO8601DateFormatter.leazrTimestamp.string(from: Date())),
                    "bought_back_price": .double(price),
                ])
                .eq("id", value: equipment.id)
                .execute()

            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    // MARK: - Documents

    static func documents(contractId: String) async -> [ContractDocument] {
        (try? await Backend.client
            .from("contract_documents")
            .select(ContractDocument.columns)
            .eq("contract_id", value: contractId)
            .order("uploaded_at", ascending: false)
            .execute().value) ?? []
    }

    // MARK: - Relance

    static func sendFollowUp(
        contractId: String,
        to recipient: String,
        subject: String,
        html: String
    ) async throws {
        struct Response: Decodable {
            let success: Bool?
            let error: String?
        }
        let response: Response = try await Backend.client.functions.invoke(
            "send-manual-followup-email",
            options: FunctionInvokeOptions(body: [
                "contractId": AnyJSON.string(contractId),
                "to": .string(recipient),
                "subject": .string(subject),
                "html": .string(html),
            ])
        )
        if response.success != true {
            throw OfferActions.ActionError.message(response.error ?? "Envoi impossible.")
        }
    }
}

extension Format {
    /// Date nue `yyyy-MM-dd`, format des colonnes `date` de Postgres.
    static func day(_ value: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f.string(from: value)
    }
}
