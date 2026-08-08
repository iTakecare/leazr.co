import Foundation
import SwiftUI
import Supabase

/// Transition de statut d'une demande, portage fidèle de `updateOfferStatus`
/// dans `src/services/offers/offerStatus.ts`.
///
/// Changer un statut n'est pas écrire une colonne : selon la destination, cela
/// libère du stock réservé, crée un contrat, y recopie les équipements et
/// réaffecte le matériel. Ne faire que l'écriture laissait des demandes
/// « validées » sans contrat et du matériel bloqué en réservation.
@MainActor
enum OfferStatusService {

    /// Statuts qui déclenchent la conversion en contrat.
    private static let finalStatuses: Set<String> = ["validated", "offer_validation", "financed"]

    /// Statuts qui tuent la demande : le matériel réservé doit repartir en stock.
    private static let deadStatuses: Set<String> = [
        "internal_rejected", "leaser_rejected", "without_follow_up",
    ]

    struct Options {
        var rejectionCategory: String?
        /// Motif fin, écrit sur le journal — le web le pose après coup depuis
        /// `NoFollowUpModal`, on le fournit directement à l'insertion.
        var subReason: String?
    }

    struct Result {
        var released = 0
        var contractId: String?
        var assigned = 0
    }

    /// Applique la transition et tout ce qu'elle entraîne. Renvoie `nil` si la
    /// mise à jour du statut elle-même a échoué ; les effets de bord, eux, sont
    /// au mieux : un contrat créé ne doit pas être annulé par un mouvement de
    /// stock manqué.
    @discardableResult
    static func update(
        offerId: String,
        to newStatus: String,
        from previousStatus: String?,
        reason: String?,
        options: Options = Options()
    ) async -> Result? {

        guard !newStatus.isEmpty else { return nil }
        let safePrevious = (previousStatus?.isEmpty == false) ? previousStatus! : "draft"

        var update: [String: AnyJSON] = ["workflow_status": .string(newStatus)]
        if let score = WorkflowScoring.scoreUpdate(for: newStatus) {
            update[score.field] = .string(score.value)
        }
        if let category = options.rejectionCategory {
            update["rejection_category"] = .string(category)
        }

        do {
            try await Backend.client
                .from("offers")
                .update(update)
                .eq("id", value: offerId)
                .execute()
        } catch {
            return nil
        }

        var result = Result()
        let context = await offerContext(offerId)

        if deadStatuses.contains(newStatus) {
            result.released = await releaseStock(offerId: offerId, companyId: context?.companyId)
        }

        await log(
            offerId: offerId,
            previous: safePrevious,
            new: newStatus,
            reason: reason,
            subReason: options.subReason
        )

        if finalStatuses.contains(newStatus), let context, !context.isPurchase {
            // Une offre d'achat ne donne pas de contrat : elle part en
            // facturation directe, créée à la main depuis la demande.
            if let contractId = await createContract(offerId: offerId, context: context) {
                result.contractId = contractId
                result.assigned = await assignStock(
                    offerId: offerId,
                    contractId: contractId,
                    companyId: context.companyId
                )
            }
        }

        return result
    }

    // MARK: - Journal

    private static func log(
        offerId: String,
        previous: String,
        new: String,
        reason: String?,
        subReason: String?
    ) async {
        // Le journal ne doit jamais faire échouer une transition déjà écrite.
        _ = try? await Backend.client
            .from("offer_workflow_logs")
            .insert([
                "offer_id": AnyJSON.string(offerId),
                "user_id": Session.shared.userId.map(AnyJSON.string) ?? .null,
                "previous_status": .string(previous),
                "new_status": .string(new),
                "reason": reason.map(AnyJSON.string) ?? .null,
                "sub_reason": subReason.map(AnyJSON.string) ?? .null,
            ])
            .execute()
    }

    // MARK: - Contexte de la demande

    struct OfferContext: Decodable {
        let companyId: String?
        let clientId: String?
        let clientName: String?
        let userId: String?
        let leaserId: String?
        let monthlyPayment: Double?
        let equipmentDescription: String?
        let isPurchase: Bool

        enum CodingKeys: String, CodingKey {
            case companyId = "company_id"
            case clientId = "client_id"
            case clientName = "client_name"
            case userId = "user_id"
            case leaserId = "leaser_id"
            case monthlyPayment = "monthly_payment"
            case equipmentDescription = "equipment_description"
            case isPurchase = "is_purchase"
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            companyId = try c.decodeIfPresent(String.self, forKey: .companyId)
            clientId = try c.decodeIfPresent(String.self, forKey: .clientId)
            clientName = try c.decodeIfPresent(String.self, forKey: .clientName)
            userId = try c.decodeIfPresent(String.self, forKey: .userId)
            leaserId = try c.decodeIfPresent(String.self, forKey: .leaserId)
            monthlyPayment = try c.decodeIfPresent(Double.self, forKey: .monthlyPayment)
            equipmentDescription = try c.decodeIfPresent(String.self, forKey: .equipmentDescription)
            isPurchase = try c.decodeIfPresent(Bool.self, forKey: .isPurchase) ?? false
        }
    }

    private static func offerContext(_ offerId: String) async -> OfferContext? {
        let rows: [OfferContext] = (try? await Backend.client
            .from("offers")
            .select("company_id, client_id, client_name, user_id, leaser_id, monthly_payment, equipment_description, is_purchase")
            .eq("id", value: offerId)
            .limit(1)
            .execute().value) ?? []
        return rows.first
    }

    // MARK: - Stock

    private struct StockLink: Decodable {
        let sourceStockItemId: String?
        enum CodingKeys: String, CodingKey { case sourceStockItemId = "source_stock_item_id" }
    }

    private struct StockItemId: Decodable {
        let id: String
    }

    private static func reservedStockIds(offerId: String) async -> [String] {
        let rows: [StockLink] = (try? await Backend.client
            .from("offer_equipment")
            .select("source_stock_item_id")
            .eq("offer_id", value: offerId)
            .not("source_stock_item_id", operator: .is, value: "null")
            .execute().value) ?? []
        return rows.compactMap(\.sourceStockItemId)
    }

    /// Relibère le matériel d'une demande dont on connaît déjà la société.
    /// Utilisé aussi avant une suppression, où le dossier va disparaître.
    static func releaseReservedStock(offerId: String) async -> Int {
        let context = await offerContext(offerId)
        return await releaseStock(offerId: offerId, companyId: context?.companyId)
    }

    /// Relibère le matériel réservé pour une demande morte, et trace chaque
    /// mouvement — c'est ce que fait `releaseStockReservationsForOffer`.
    private static func releaseStock(offerId: String, companyId: String?) async -> Int {
        let ids = await reservedStockIds(offerId: offerId)
        guard !ids.isEmpty, let companyId else { return 0 }

        let released: [StockItemId] = (try? await Backend.client
            .from("stock_items")
            .update(["status": "in_stock"])
            .in("id", values: ids)
            .eq("status", value: "reserved")
            .select("id")
            .execute().value) ?? []

        for item in released {
            _ = try? await Backend.client
                .from("stock_movements")
                .insert([
                    "company_id": AnyJSON.string(companyId),
                    "stock_item_id": .string(item.id),
                    "movement_type": .string("release_offer"),
                    "from_status": .string("reserved"),
                    "to_status": .string("in_stock"),
                    "performed_by": Session.shared.userId.map(AnyJSON.string) ?? .null,
                    "notes": .string("Libéré (offre \(offerId))"),
                ])
                .execute()
        }

        return released.count
    }

    /// Transforme les réservations en assignations sur le contrat créé.
    private static func assignStock(offerId: String, contractId: String, companyId: String?) async -> Int {
        let ids = await reservedStockIds(offerId: offerId)
        guard !ids.isEmpty, let companyId else { return 0 }

        let assigned: [StockItemId] = (try? await Backend.client
            .from("stock_items")
            .update([
                "status": AnyJSON.string("assigned"),
                "current_contract_id": .string(contractId),
            ])
            .in("id", values: ids)
            .in("status", values: ["reserved", "in_stock"])
            .select("id")
            .execute().value) ?? []

        for item in assigned {
            _ = try? await Backend.client
                .from("stock_movements")
                .insert([
                    "company_id": AnyJSON.string(companyId),
                    "stock_item_id": .string(item.id),
                    "movement_type": .string("assign_contract"),
                    "from_status": .string("reserved"),
                    "to_status": .string("assigned"),
                    "contract_id": .string(contractId),
                    "performed_by": Session.shared.userId.map(AnyJSON.string) ?? .null,
                    "notes": .string("Assigné via offre \(offerId)"),
                ])
                .execute()
        }

        return assigned.count
    }

    // MARK: - Conversion en contrat

    private struct LeaserInfo: Decodable {
        let name: String?
        let companyName: String?
        let logoURL: String?
        let isOwnCompany: Bool?

        enum CodingKeys: String, CodingKey {
            case name
            case companyName = "company_name"
            case logoURL = "logo_url"
            case isOwnCompany = "is_own_company"
        }
    }

    private struct InsertedRow: Decodable { let id: String }

    private static func createContract(offerId: String, context: OfferContext) async -> String? {

        // Bailleur : celui choisi sur la demande, sinon le premier de la
        // société — même repli que le web, pour ne jamais créer un contrat
        // orphelin de bailleur.
        var leaser: LeaserInfo?
        if let leaserId = context.leaserId {
            let rows: [LeaserInfo] = (try? await Backend.client
                .from("leasers")
                .select("name, company_name, logo_url, is_own_company")
                .eq("id", value: leaserId)
                .limit(1)
                .execute().value) ?? []
            leaser = rows.first
        }
        if leaser == nil, let companyId = context.companyId {
            let rows: [LeaserInfo] = (try? await Backend.client
                .from("leasers")
                .select("name, company_name, logo_url, is_own_company")
                .eq("company_id", value: companyId)
                .limit(1)
                .execute().value) ?? []
            leaser = rows.first
        }

        let leaserName = leaser?.name ?? leaser?.companyName ?? "Leaser par défaut"
        let isSelfLeasing = leaser?.isOwnCompany ?? false

        // Le numéro de contrat n'est généré que pour l'auto-leasing, par la
        // RPC dédiée : le générer ici produirait des doublons.
        var contractNumber: String?
        if isSelfLeasing, let companyId = context.companyId {
            contractNumber = try? await Backend.client
                .rpc("generate_self_leasing_contract_number", params: ["p_company_id": companyId])
                .execute()
                .value
        }

        var payload: [String: AnyJSON] = [
            "offer_id": .string(offerId),
            "client_name": context.clientName.map(AnyJSON.string) ?? .null,
            "client_id": context.clientId.map(AnyJSON.string) ?? .null,
            "monthly_payment": context.monthlyPayment.map { AnyJSON.double($0) } ?? .null,
            "equipment_description": context.equipmentDescription.map(AnyJSON.string) ?? .null,
            "leaser_id": context.leaserId.map(AnyJSON.string) ?? .null,
            "leaser_name": .string(leaserName),
            "leaser_logo": leaser?.logoURL.map(AnyJSON.string) ?? .null,
            "status": .string("contract_sent"),
            "user_id": context.userId.map(AnyJSON.string) ?? .null,
            "company_id": context.companyId.map(AnyJSON.string) ?? .null,
            "is_self_leasing": .bool(isSelfLeasing),
        ]
        payload["contract_number"] = contractNumber.map(AnyJSON.string) ?? .null

        let inserted: [InsertedRow]
        do {
            inserted = try await Backend.client
                .from("contracts")
                .insert(payload)
                .select("id")
                .execute()
                .value
        } catch {
            return nil
        }

        guard let contractId = inserted.first?.id else { return nil }

        await copyEquipment(offerId: offerId, contractId: contractId)

        // La demande est marquée convertie et financée. Le champ historique
        // `status` reste « accepted » : c'est le drapeau de dossier gagné.
        _ = try? await Backend.client
            .from("offers")
            .update([
                "converted_to_contract": AnyJSON.bool(true),
                "status": .string("accepted"),
                "workflow_status": .string("financed"),
            ])
            .eq("id", value: offerId)
            .execute()

        return contractId
    }

    private struct SourceEquipment: Decodable {
        let id: String
        let title: String?
        let purchasePrice: Double?
        let quantity: Int?
        let margin: Double?
        let monthlyPayment: Double?
        let serialNumber: String?
        let isGifted: Bool?
        let categoryId: String?
        let basePurchasePrice: Double?
        let orderStatus: String?
        let supplierId: String?
        let supplierPrice: Double?
        let orderDate: String?
        let orderReference: String?
        let receptionDate: String?
        let orderNotes: String?

        static let columns = """
            id, title, purchase_price, quantity, margin, monthly_payment, serial_number, \
            is_gifted, category_id, base_purchase_price, order_status, supplier_id, \
            supplier_price, order_date, order_reference, reception_date, order_notes
            """

        enum CodingKeys: String, CodingKey {
            case id, title, quantity, margin
            case purchasePrice = "purchase_price"
            case monthlyPayment = "monthly_payment"
            case serialNumber = "serial_number"
            case isGifted = "is_gifted"
            case categoryId = "category_id"
            case basePurchasePrice = "base_purchase_price"
            case orderStatus = "order_status"
            case supplierId = "supplier_id"
            case supplierPrice = "supplier_price"
            case orderDate = "order_date"
            case orderReference = "order_reference"
            case receptionDate = "reception_date"
            case orderNotes = "order_notes"
        }
    }

    private struct KeyValue: Decodable {
        let key: String
        let value: String
    }

    /// Recopie les équipements de la demande vers le contrat, attributs et
    /// spécifications compris, ainsi que le suivi de commande fournisseur —
    /// sans quoi le contrat repart à « À commander » sans fournisseur ni prix.
    private static func copyEquipment(offerId: String, contractId: String) async {
        let items: [SourceEquipment] = (try? await Backend.client
            .from("offer_equipment")
            .select(SourceEquipment.columns)
            .eq("offer_id", value: offerId)
            .order("created_at", ascending: true)
            .execute().value) ?? []

        for item in items {
            var payload: [String: AnyJSON] = [
                "contract_id": .string(contractId),
                "title": item.title.map(AnyJSON.string) ?? .null,
                "purchase_price": item.purchasePrice.map { AnyJSON.double($0) } ?? .null,
                "quantity": .integer(item.quantity ?? 1),
                "margin": item.margin.map { AnyJSON.double($0) } ?? .null,
                "monthly_payment": item.monthlyPayment.map { AnyJSON.double($0) } ?? .null,
                "serial_number": item.serialNumber.map(AnyJSON.string) ?? .null,
                "is_gifted": .bool(item.isGifted ?? false),
                "category_id": item.categoryId.map(AnyJSON.string) ?? .null,
                "base_purchase_price": (item.basePurchasePrice ?? item.purchasePrice)
                    .map { AnyJSON.double($0) } ?? .null,
                "order_status": .string(item.orderStatus ?? "to_order"),
                "supplier_id": item.supplierId.map(AnyJSON.string) ?? .null,
                "supplier_price": item.supplierPrice.map { AnyJSON.double($0) } ?? .null,
                "order_date": item.orderDate.map(AnyJSON.string) ?? .null,
                "order_reference": item.orderReference.map(AnyJSON.string) ?? .null,
                "reception_date": item.receptionDate.map(AnyJSON.string) ?? .null,
                "order_notes": item.orderNotes.map(AnyJSON.string) ?? .null,
            ]
            // Tableau de bord des achats : prix et date d'achat effectifs.
            payload["actual_purchase_price"] = item.supplierPrice.map { AnyJSON.double($0) } ?? .null
            payload["actual_purchase_date"] = item.orderDate.map(AnyJSON.string) ?? .null

            let created: [InsertedRow] = (try? await Backend.client
                .from("contract_equipment")
                .insert(payload)
                .select("id")
                .execute().value) ?? []

            guard let newId = created.first?.id else { continue }

            await copyKeyValues(
                from: "offer_equipment_attributes",
                to: "contract_equipment_attributes",
                sourceEquipmentId: item.id,
                targetEquipmentId: newId
            )
            await copyKeyValues(
                from: "offer_equipment_specifications",
                to: "contract_equipment_specifications",
                sourceEquipmentId: item.id,
                targetEquipmentId: newId
            )
        }
    }

    private static func copyKeyValues(
        from source: String,
        to target: String,
        sourceEquipmentId: String,
        targetEquipmentId: String
    ) async {
        let rows: [KeyValue] = (try? await Backend.client
            .from(source)
            .select("key, value")
            .eq("equipment_id", value: sourceEquipmentId)
            .execute().value) ?? []

        guard !rows.isEmpty else { return }

        _ = try? await Backend.client
            .from(target)
            .insert(rows.map { row in
                [
                    "equipment_id": AnyJSON.string(targetEquipmentId),
                    "key": .string(row.key),
                    "value": .string(row.value),
                ]
            })
            .execute()
    }
}
