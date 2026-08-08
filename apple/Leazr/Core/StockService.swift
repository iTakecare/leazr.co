import Foundation
import SwiftUI
import Supabase

/// Opérations de stock, portage de `stockService.ts`.
///
/// Toutes les écritures qui changent un statut créent aussi un mouvement : la
/// traçabilité de l'appareil est la raison d'être du module.
@MainActor
enum StockService {

    // MARK: - Articles

    static func items(companyId: String) async -> [StockItem] {
        (try? await Backend.client
            .from("stock_items")
            .select(StockItem.columns)
            .eq("company_id", value: companyId)
            .order("updated_at", ascending: false)
            .limit(1000)
            .execute().value) ?? []
    }

    static func item(id: String) async -> StockItem? {
        let rows: [StockItem] = (try? await Backend.client
            .from("stock_items")
            .select(StockItem.columns)
            .eq("id", value: id)
            .limit(1)
            .execute().value) ?? []
        return rows.first
    }

    struct ItemInput {
        var title = ""
        var serialNumber = ""
        var status = "in_stock"
        var condition = "good"
        var source = "purchase"
        var quantity = 1
        var purchasePrice: Double = 0
        var unitPrice: Double = 0
        var supplierId: String?
        var location = ""
        var category = ""
        var brand = ""
        var model = ""
        var cpu = ""
        var memory = ""
        var storage = ""
        var grade = ""
        var notes = ""
        var receptionDate: Date?
        var warrantyEndDate: Date?
    }

    private static func payload(_ input: ItemInput) -> [String: AnyJSON] {
        func text(_ value: String) -> AnyJSON {
            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? .null : .string(trimmed)
        }

        var payload: [String: AnyJSON] = [
            "title": .string(input.title.trimmingCharacters(in: .whitespaces)),
            "serial_number": text(input.serialNumber),
            "status": .string(input.status),
            "condition": .string(input.condition),
            "source": .string(input.source),
            "quantity": .integer(max(1, input.quantity)),
            "purchase_price": .double(input.purchasePrice),
            "unit_price": .double(input.unitPrice > 0 ? input.unitPrice : input.purchasePrice),
            "supplier_id": input.supplierId.map(AnyJSON.string) ?? .null,
            "location": text(input.location),
            "category": text(input.category),
            "brand": text(input.brand),
            "model": text(input.model),
            "cpu": text(input.cpu),
            "memory": text(input.memory),
            "storage": text(input.storage),
            "grade": text(input.grade),
            "notes": text(input.notes),
        ]
        payload["reception_date"] = input.receptionDate.map { AnyJSON.string(Format.day($0)) } ?? .null
        payload["warranty_end_date"] = input.warrantyEndDate.map { AnyJSON.string(Format.day($0)) } ?? .null
        return payload
    }

    /// Crée un article. Une entrée directe en stock est tracée par un
    /// mouvement de réception, comme `receiveToStock`.
    static func createItem(companyId: String, _ input: ItemInput) async -> String? {
        struct Row: Decodable { let id: String }

        var body = payload(input)
        body["company_id"] = .string(companyId)

        do {
            let created: [Row] = try await Backend.client
                .from("stock_items")
                .insert(body)
                .select("id")
                .execute()
                .value
            guard let id = created.first?.id else { return nil }

            if input.status == "in_stock" {
                await addMovement(
                    companyId: companyId,
                    stockItemId: id,
                    type: "reception",
                    from: nil,
                    to: "in_stock",
                    cost: input.purchasePrice,
                    notes: "Réception en stock"
                )
            }

            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return id
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return nil
        }
    }

    static func updateItem(id: String, _ input: ItemInput) async -> Bool {
        do {
            try await Backend.client
                .from("stock_items")
                .update(payload(input))
                .eq("id", value: id)
                .execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    /// Change le statut d'un article et trace le mouvement correspondant.
    static func changeStatus(
        item: StockItem,
        companyId: String,
        to status: String,
        movementType: String,
        notes: String?
    ) async -> Bool {
        do {
            try await Backend.client
                .from("stock_items")
                .update(["status": AnyJSON.string(status)])
                .eq("id", value: item.id)
                .execute()

            await addMovement(
                companyId: companyId,
                stockItemId: item.id,
                type: movementType,
                from: item.status,
                to: status,
                cost: nil,
                notes: notes
            )
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    static func deleteItem(id: String) async -> Bool {
        do {
            try await Backend.client.from("stock_items").delete().eq("id", value: id).execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    // MARK: - Mouvements

    static func addMovement(
        companyId: String,
        stockItemId: String,
        type: String,
        from: String?,
        to: String?,
        cost: Double?,
        notes: String?,
        contractId: String? = nil
    ) async {
        _ = try? await Backend.client
            .from("stock_movements")
            .insert([
                "company_id": AnyJSON.string(companyId),
                "stock_item_id": .string(stockItemId),
                "movement_type": .string(type),
                "from_status": from.map(AnyJSON.string) ?? .null,
                "to_status": to.map(AnyJSON.string) ?? .null,
                "contract_id": contractId.map(AnyJSON.string) ?? .null,
                "cost": cost.map { AnyJSON.double($0) } ?? .null,
                "performed_by": Session.shared.userId.map(AnyJSON.string) ?? .null,
                "notes": notes.map(AnyJSON.string) ?? .null,
            ])
            .execute()
    }

    /// Vue globale : tous les mouvements de la société, avec l'article concerné.
    static func movements(companyId: String, limit: Int = 200) async -> [GlobalMovement] {
        (try? await Backend.client
            .from("stock_movements")
            .select(GlobalMovement.columns)
            .eq("company_id", value: companyId)
            .order("created_at", ascending: false)
            .limit(limit)
            .execute().value) ?? []
    }

    // MARK: - Coûts additionnels

    static func costs(stockItemId: String) async -> [StockItemCost] {
        (try? await Backend.client
            .from("stock_item_costs")
            .select(StockItemCost.columns)
            .eq("stock_item_id", value: stockItemId)
            .order("cost_date", ascending: false)
            .execute().value) ?? []
    }

    static func addCost(
        companyId: String,
        stockItemId: String,
        label: String,
        amount: Double,
        category: String,
        date: Date,
        notes: String?
    ) async -> Bool {
        do {
            try await Backend.client
                .from("stock_item_costs")
                .insert([
                    "company_id": AnyJSON.string(companyId),
                    "stock_item_id": .string(stockItemId),
                    "label": .string(label),
                    "amount": .double(amount),
                    "category": .string(category),
                    "cost_date": .string(Format.day(date)),
                    "notes": notes.map(AnyJSON.string) ?? .null,
                    "created_by": Session.shared.userId.map(AnyJSON.string) ?? .null,
                ])
                .execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    static func deleteCost(id: String) async -> Bool {
        do {
            try await Backend.client.from("stock_item_costs").delete().eq("id", value: id).execute()
            return true
        } catch {
            return false
        }
    }

    // MARK: - Réparations

    static func repairs(companyId: String) async -> [StockRepair] {
        (try? await Backend.client
            .from("stock_repairs")
            .select(StockRepair.columns)
            .eq("company_id", value: companyId)
            .order("started_at", ascending: false)
            .execute().value) ?? []
    }

    /// Envoie un article en réparation : la fiche de réparation est créée et
    /// l'article bascule en « En réparation », mouvement à l'appui.
    static func startRepair(
        companyId: String,
        item: StockItem,
        reason: String,
        description: String?,
        cost: Double,
        supplierId: String?
    ) async -> Bool {
        do {
            try await Backend.client
                .from("stock_repairs")
                .insert([
                    "company_id": AnyJSON.string(companyId),
                    "stock_item_id": .string(item.id),
                    "reason": .string(reason),
                    "description": description.map(AnyJSON.string) ?? .null,
                    "repair_cost": .double(cost),
                    "supplier_id": supplierId.map(AnyJSON.string) ?? .null,
                    "status": .string("pending"),
                    "started_at": .string(ISO8601DateFormatter.leazrTimestamp.string(from: Date())),
                ])
                .execute()

            _ = await changeStatus(
                item: item,
                companyId: companyId,
                to: "in_repair",
                movementType: "repair_start",
                notes: "Départ en réparation — \(reason)"
            )
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    /// Clôt une réparation. Un retour réussi remet l'article en stock avec
    /// l'état constaté ; un abandon le met au rebut.
    static func finishRepair(
        companyId: String,
        repair: StockRepair,
        status: String,
        resultCondition: String?,
        cost: Double?,
        notes: String?
    ) async -> Bool {
        do {
            var payload: [String: AnyJSON] = [
                "status": .string(status),
                "completed_at": .string(ISO8601DateFormatter.leazrTimestamp.string(from: Date())),
                "result_condition": resultCondition.map(AnyJSON.string) ?? .null,
                "notes": notes.map(AnyJSON.string) ?? .null,
            ]
            if let cost { payload["repair_cost"] = .double(cost) }

            try await Backend.client
                .from("stock_repairs")
                .update(payload)
                .eq("id", value: repair.id)
                .execute()

            let target = status == "completed" ? "in_stock" : "scrapped"
            var itemUpdate: [String: AnyJSON] = ["status": .string(target)]
            if let resultCondition { itemUpdate["condition"] = .string(resultCondition) }

            try await Backend.client
                .from("stock_items")
                .update(itemUpdate)
                .eq("id", value: repair.stockItemId)
                .execute()

            await addMovement(
                companyId: companyId,
                stockItemId: repair.stockItemId,
                type: status == "completed" ? "repair_end" : "scrap",
                from: "in_repair",
                to: target,
                cost: cost,
                notes: status == "completed" ? "Retour de réparation" : "Réparation abandonnée — mis au rebut"
            )

            // Le coût de réparation grève la valeur de l'appareil : il rejoint
            // ses coûts additionnels, sinon la valorisation ment.
            if let cost, cost > 0 {
                _ = await addCost(
                    companyId: companyId,
                    stockItemId: repair.stockItemId,
                    label: repair.reason,
                    amount: cost,
                    category: "repair",
                    date: Date(),
                    notes: notes
                )
            }

            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    // MARK: - Rachetables

    /// Matériel de contrats terminés, expirés ou bientôt échus, pas encore
    /// racheté. Le calcul de la date de fin reprend `computeEnd` : date de fin
    /// explicite, sinon début + durée, sinon livraison + durée.
    static func buybackable(companyId: String, withinDays: Int = 30) async -> [BuybackableEquipment] {
        struct Row: Decodable {
            let id: String
            let contractId: String
            let title: String?
            let serialNumber: String?
            let quantity: Int?
            let purchasePrice: Double?
            let contract: ContractRef?

            struct ContractRef: Decodable {
                let contractNumber: String?
                let clientName: String?
                let status: String?
                let startDate: String?
                let endDate: String?
                let duration: Int?
                let deliveryDate: String?
                let companyId: String?

                enum CodingKeys: String, CodingKey {
                    case contractNumber = "contract_number"
                    case clientName = "client_name"
                    case status
                    case startDate = "contract_start_date"
                    case endDate = "contract_end_date"
                    case duration = "contract_duration"
                    case deliveryDate = "delivery_date"
                    case companyId = "company_id"
                }
            }

            enum CodingKeys: String, CodingKey {
                case id, title, quantity, contract
                case contractId = "contract_id"
                case serialNumber = "serial_number"
                case purchasePrice = "purchase_price"
            }
        }

        let rows: [Row] = (try? await Backend.client
            .from("contract_equipment")
            .select("""
                id, contract_id, title, serial_number, quantity, purchase_price, \
                contract:contracts!inner(contract_number, client_name, status, \
                contract_start_date, contract_end_date, contract_duration, \
                delivery_date, company_id)
                """)
            .is("bought_back_at", value: nil)
            .eq("contract.company_id", value: companyId)
            .limit(500)
            .execute().value) ?? []

        let calendar = Calendar.current
        let now = Date()

        return rows.compactMap { row -> BuybackableEquipment? in
            guard let contract = row.contract else { return nil }

            let end: Date? = {
                if let raw = contract.endDate, let date = Format.parseDate(raw) { return date }
                guard let duration = contract.duration else { return nil }
                if let raw = contract.startDate, let date = Format.parseDate(raw) {
                    return calendar.date(byAdding: .month, value: duration, to: date)
                }
                if let raw = contract.deliveryDate, let date = Format.parseDate(raw) {
                    return calendar.date(byAdding: .month, value: duration, to: date)
                }
                return nil
            }()

            let days = end.map { calendar.dateComponents([.day], from: now, to: $0).day ?? 0 }

            let status: BuybackableEquipment.EndStatus
            if contract.status == "completed" {
                status = .completed
            } else if let days, days < 0 {
                status = .expired
            } else if let days, days <= withinDays {
                status = .endingSoon
            } else {
                // Ni terminé, ni échu, ni proche : pas encore rachetable.
                return nil
            }

            return BuybackableEquipment(
                id: row.id,
                contractId: row.contractId,
                title: row.title ?? "Équipement",
                serialNumber: row.serialNumber,
                quantity: row.quantity ?? 1,
                purchasePrice: row.purchasePrice ?? 0,
                contractNumber: contract.contractNumber,
                clientName: contract.clientName,
                endDate: end,
                daysUntilEnd: days,
                endStatus: status
            )
        }
        .sorted { ($0.daysUntilEnd ?? .max) < ($1.daysUntilEnd ?? .max) }
    }

    // MARK: - Swap

    /// Swap d'un appareil sur un contrat, portage de `swapContractEquipment`.
    ///
    /// L'ancien appareil revient en stock en état défectueux, la ligne du
    /// contrat passe au nouveau avec son prix d'achat réel — la mensualité du
    /// client, elle, ne bouge pas.
    static func swap(
        companyId: String,
        contractId: String,
        offerId: String?,
        equipment: ContractEquipment,
        newTitle: String,
        newSerialNumber: String?,
        newPurchasePrice: Double,
        reason: String
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
                    "quantity": .integer(1),
                    "status": .string("in_stock"),
                    "condition": .string("defective"),
                    "purchase_price": .double(equipment.purchasePrice),
                    "unit_price": .double(equipment.purchasePrice),
                    "source": .string("contract_swap"),
                    "source_contract_id": .string(contractId),
                    "source_contract_equipment_id": .string(equipment.id),
                    "reception_date": .string(today),
                    "notes": .string(
                        "Retour swap — remplacé par « \(newTitle) »"
                            + (reason.isEmpty ? "" : " (\(reason))")
                    ),
                ])
                .select("id")
                .execute()
                .value

            guard let stockItem = created.first else { return false }

            await addMovement(
                companyId: companyId,
                stockItemId: stockItem.id,
                type: "swap_out",
                from: nil,
                to: "in_stock",
                cost: equipment.purchasePrice,
                notes: "Ancien appareil revenu en stock suite à un swap de contrat",
                contractId: contractId
            )

            try await Backend.client
                .from("contract_equipment")
                .update([
                    "title": AnyJSON.string(newTitle),
                    "serial_number": newSerialNumber.map(AnyJSON.string) ?? .null,
                    "actual_purchase_price": .double(newPurchasePrice),
                    "actual_purchase_date": .string(ISO8601DateFormatter.leazrTimestamp.string(from: Date())),
                ])
                .eq("id", value: equipment.id)
                .execute()

            _ = try? await Backend.client
                .from("equipment_swaps")
                .insert([
                    "company_id": AnyJSON.string(companyId),
                    "contract_id": .string(contractId),
                    "contract_equipment_id": .string(equipment.id),
                    "offer_id": offerId.map(AnyJSON.string) ?? .null,
                    "old_title": .string(equipment.title),
                    "old_serial_number": equipment.serialNumber.map(AnyJSON.string) ?? .null,
                    "old_purchase_price": .double(equipment.purchasePrice),
                    "new_title": .string(newTitle),
                    "new_serial_number": newSerialNumber.map(AnyJSON.string) ?? .null,
                    "new_purchase_price": .double(newPurchasePrice),
                    "price_delta": .double(newPurchasePrice - equipment.purchasePrice),
                    "reason": reason.isEmpty ? .null : .string(reason),
                    "returned_stock_item_id": .string(stockItem.id),
                    "performed_by": Session.shared.userId.map(AnyJSON.string) ?? .null,
                ])
                .execute()

            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    // MARK: - Export

    static func exportCSV(_ items: [StockItem]) -> URL {
        let headers = [
            "Article", "N° de série", "Statut", "État", "Provenance", "Quantité",
            "Prix d'achat", "Fournisseur", "Emplacement", "Marque", "Modèle",
            "Configuration", "Réception", "Fin de garantie", "Contrat",
        ]
        var rows = [headers.joined(separator: ";")]

        for item in items {
            let fields = [
                item.title,
                item.serialNumber ?? "",
                StockVocabulary.statusLabel(item.status),
                StockVocabulary.conditionLabel(item.condition),
                StockVocabulary.sourceLabel(item.source),
                String(item.quantity),
                number(item.purchasePrice),
                item.supplier?.name ?? "",
                item.location ?? "",
                item.brand ?? "",
                item.model ?? "",
                item.specifications ?? "",
                item.receptionDate.map(Format.date) ?? "",
                item.warrantyEndDate.map(Format.date) ?? "",
                item.contract?.clientName ?? "",
            ]
            rows.append(fields.map(escape).joined(separator: ";"))
        }

        // BOM UTF-8 : sans lui, Excel sur Windows massacre les accents.
        let content = "\u{FEFF}" + rows.joined(separator: "\r\n")
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("Stock.csv")
        try? content.write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    private static func escape(_ value: String) -> String {
        guard value.contains(";") || value.contains("\"") || value.contains("\n") else {
            return value
        }
        return "\"\(value.replacingOccurrences(of: "\"", with: "\"\""))\""
    }

    private static func number(_ value: Double) -> String {
        String(format: "%.2f", value).replacingOccurrences(of: ".", with: ",")
    }
}

// MARK: - Modèles complémentaires

/// Mouvement enrichi de l'article concerné, pour la vue globale.
struct GlobalMovement: Decodable, Identifiable, Sendable {
    let id: String
    let movementType: String
    let fromStatus: String?
    let toStatus: String?
    let cost: Double?
    let notes: String?
    let createdAt: Date?
    let stockItem: ItemRef?

    struct ItemRef: Decodable, Sendable {
        let title: String?
        let serialNumber: String?
        enum CodingKeys: String, CodingKey {
            case title
            case serialNumber = "serial_number"
        }
    }

    static let columns = """
        id, movement_type, from_status, to_status, cost, notes, created_at, \
        stock_item:stock_items(title, serial_number)
        """

    enum CodingKeys: String, CodingKey {
        case id, cost, notes
        case movementType = "movement_type"
        case fromStatus = "from_status"
        case toStatus = "to_status"
        case createdAt = "created_at"
        case stockItem = "stock_item"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        movementType = try c.decodeIfPresent(String.self, forKey: .movementType) ?? ""
        fromStatus = try c.decodeIfPresent(String.self, forKey: .fromStatus)
        toStatus = try c.decodeIfPresent(String.self, forKey: .toStatus)
        cost = try c.decodeIfPresent(Double.self, forKey: .cost)
        notes = try c.decodeIfPresent(String.self, forKey: .notes)
        stockItem = try c.decodeIfPresent(ItemRef.self, forKey: .stockItem)
        if let raw = try c.decodeIfPresent(String.self, forKey: .createdAt) {
            createdAt = Format.parseDate(raw)
        } else { createdAt = nil }
    }

    /// Le libellé et la couleur d'un mouvement sont ceux de `StockMovement`.
    private var proxy: StockMovement? {
        let json = """
        {"id":"\(id)","movement_type":"\(movementType)"}
        """
        return try? JSONDecoder().decode(StockMovement.self, from: Data(json.utf8))
    }

    var label: String { proxy?.label ?? movementType.capitalized }
    var icon: String { proxy?.icon ?? "clock" }
    var tint: Color { proxy?.tint ?? Theme.mutedForeground }
}

/// Coût additionnel imputé à un article (`stock_item_costs`).
struct StockItemCost: Decodable, Identifiable, Sendable {
    let id: String
    let label: String
    let amount: Double
    let category: String
    let costDate: Date?
    let notes: String?

    static let columns = "id, label, amount, category, cost_date, notes"

    enum CodingKeys: String, CodingKey {
        case id, label, amount, category, notes
        case costDate = "cost_date"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        label = try c.decodeIfPresent(String.self, forKey: .label) ?? "Coût"
        amount = try c.decodeIfPresent(Double.self, forKey: .amount) ?? 0
        category = try c.decodeIfPresent(String.self, forKey: .category) ?? "other"
        notes = try c.decodeIfPresent(String.self, forKey: .notes)
        if let raw = try c.decodeIfPresent(String.self, forKey: .costDate) {
            costDate = Format.parseDate(raw)
        } else { costDate = nil }
    }

    var categoryLabel: String { StockVocabulary.costCategoryLabel(category) }
    var categoryTint: Color { StockVocabulary.costCategoryTint(category) }
}

/// Réparation en cours ou passée (`stock_repairs`).
struct StockRepair: Decodable, Identifiable, Sendable {
    let id: String
    let stockItemId: String
    let reason: String
    let description: String?
    let repairCost: Double
    let status: String
    let startedAt: Date?
    let completedAt: Date?
    let resultCondition: String?
    let notes: String?
    let stockItem: GlobalMovement.ItemRef?

    static let columns = """
        id, stock_item_id, reason, description, repair_cost, status, started_at, \
        completed_at, result_condition, notes, stock_item:stock_items(title, serial_number)
        """

    enum CodingKeys: String, CodingKey {
        case id, reason, description, status, notes
        case stockItemId = "stock_item_id"
        case repairCost = "repair_cost"
        case startedAt = "started_at"
        case completedAt = "completed_at"
        case resultCondition = "result_condition"
        case stockItem = "stock_item"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        stockItemId = try c.decodeIfPresent(String.self, forKey: .stockItemId) ?? ""
        reason = try c.decodeIfPresent(String.self, forKey: .reason) ?? "Réparation"
        description = try c.decodeIfPresent(String.self, forKey: .description)
        repairCost = try c.decodeIfPresent(Double.self, forKey: .repairCost) ?? 0
        status = try c.decodeIfPresent(String.self, forKey: .status) ?? "pending"
        resultCondition = try c.decodeIfPresent(String.self, forKey: .resultCondition)
        notes = try c.decodeIfPresent(String.self, forKey: .notes)
        stockItem = try c.decodeIfPresent(GlobalMovement.ItemRef.self, forKey: .stockItem)

        func date(_ key: CodingKeys) throws -> Date? {
            guard let raw = try c.decodeIfPresent(String.self, forKey: key) else { return nil }
            return Format.parseDate(raw)
        }
        startedAt = try date(.startedAt)
        completedAt = try date(.completedAt)
    }

    var isOpen: Bool { status == "pending" || status == "in_progress" }
}

/// Matériel de contrat éligible au rachat.
struct BuybackableEquipment: Identifiable, Sendable {
    enum EndStatus: Sendable {
        case endingSoon
        case expired
        case completed

        var label: String {
            switch self {
            case .endingSoon: return "Bientôt échu"
            case .expired:    return "Échu"
            case .completed:  return "Contrat terminé"
            }
        }

        var tint: Color {
            switch self {
            case .endingSoon: return Theme.amber
            case .expired:    return Theme.destructive
            case .completed:  return Theme.emerald
            }
        }
    }

    let id: String
    let contractId: String
    let title: String
    let serialNumber: String?
    let quantity: Int
    let purchasePrice: Double
    let contractNumber: String?
    let clientName: String?
    let endDate: Date?
    let daysUntilEnd: Int?
    let endStatus: EndStatus
}

extension StockVocabulary {

    static func costCategoryLabel(_ code: String) -> String {
        switch code {
        case "repair":   return "Réparation"
        case "upgrade":  return "Amélioration"
        case "part":     return "Pièce détachée"
        case "shipping": return "Logistique"
        default:         return "Autre"
        }
    }

    static func costCategoryTint(_ code: String) -> Color {
        switch code {
        case "repair":   return Theme.amber
        case "upgrade":  return Theme.violet
        case "part":     return Theme.teal
        case "shipping": return Theme.sky
        default:         return Theme.mutedForeground
        }
    }

    static let costCategories: [(code: String, label: String)] = [
        ("repair", "Réparation"),
        ("upgrade", "Amélioration"),
        ("part", "Pièce détachée"),
        ("shipping", "Logistique"),
        ("other", "Autre"),
    ]

    static let conditions: [(code: String, label: String)] = [
        ("new", "Neuf"),
        ("like_new", "Comme neuf"),
        ("good", "Bon état"),
        ("fair", "État moyen"),
        ("defective", "Défectueux"),
    ]

    static let sources: [(code: String, label: String)] = [
        ("purchase", "Achat"),
        ("contract_buyback", "Reprise contrat"),
        ("contract_swap", "Swap contrat"),
    ]

    static func repairStatusLabel(_ code: String) -> String {
        switch code {
        case "pending":     return "En attente"
        case "in_progress": return "En cours"
        case "completed":   return "Terminée"
        case "abandoned":   return "Abandonnée"
        default:            return code.capitalized
        }
    }

    static func repairStatusTint(_ code: String) -> Color {
        switch code {
        case "pending":     return Theme.amber
        case "in_progress": return Theme.sky
        case "completed":   return Theme.emerald
        case "abandoned":   return Theme.destructive
        default:            return Theme.mutedForeground
        }
    }
}
