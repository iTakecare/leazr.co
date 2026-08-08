import Foundation
import Observation
import SwiftUI
import Supabase

// MARK: - Modèle

/// Article de stock, repris de `stockService.ts`.
struct StockItem: Decodable, Identifiable, Sendable {
    let id: String
    let title: String
    let serialNumber: String?
    let status: String
    let condition: String?
    let source: String?
    let quantity: Int
    let purchasePrice: Double
    let unitPrice: Double
    let buybackPrice: Double?
    let location: String?
    let category: String?
    let brand: String?
    let model: String?
    let cpu: String?
    let memory: String?
    let storage: String?
    let grade: String?
    let notes: String?
    let warrantyEndDate: Date?
    let receptionDate: Date?
    let updatedAt: Date?
    let supplier: NamedRow?
    let contract: ContractRow?

    struct NamedRow: Decodable, Sendable { let name: String? }

    struct ContractRow: Decodable, Sendable {
        let contractNumber: String?
        let clientName: String?
        enum CodingKeys: String, CodingKey {
            case contractNumber = "contract_number"
            case clientName = "client_name"
        }
    }

    static let columns = """
        id, title, serial_number, status, condition, source, quantity, purchase_price, \
        unit_price, buyback_price, location, category, brand, model, cpu, memory, storage, \
        grade, notes, warranty_end_date, reception_date, updated_at, \
        supplier:suppliers(name), contract:contracts!current_contract_id(contract_number, client_name)
        """

    enum CodingKeys: String, CodingKey {
        case id, title, status, condition, source, quantity, location, category
        case brand, model, cpu, memory, storage, grade, notes, supplier, contract
        case serialNumber = "serial_number"
        case purchasePrice = "purchase_price"
        case unitPrice = "unit_price"
        case buybackPrice = "buyback_price"
        case warrantyEndDate = "warranty_end_date"
        case receptionDate = "reception_date"
        case updatedAt = "updated_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        title = try c.decodeIfPresent(String.self, forKey: .title) ?? "Article"
        serialNumber = try c.decodeIfPresent(String.self, forKey: .serialNumber)
        status = try c.decodeIfPresent(String.self, forKey: .status) ?? "in_stock"
        condition = try c.decodeIfPresent(String.self, forKey: .condition)
        source = try c.decodeIfPresent(String.self, forKey: .source)
        quantity = try c.decodeIfPresent(Int.self, forKey: .quantity) ?? 1
        purchasePrice = try c.decodeIfPresent(Double.self, forKey: .purchasePrice) ?? 0
        unitPrice = try c.decodeIfPresent(Double.self, forKey: .unitPrice) ?? 0
        buybackPrice = try c.decodeIfPresent(Double.self, forKey: .buybackPrice)
        location = try c.decodeIfPresent(String.self, forKey: .location)
        category = try c.decodeIfPresent(String.self, forKey: .category)
        brand = try c.decodeIfPresent(String.self, forKey: .brand)
        model = try c.decodeIfPresent(String.self, forKey: .model)
        cpu = try c.decodeIfPresent(String.self, forKey: .cpu)
        memory = try c.decodeIfPresent(String.self, forKey: .memory)
        storage = try c.decodeIfPresent(String.self, forKey: .storage)
        grade = try c.decodeIfPresent(String.self, forKey: .grade)
        notes = try c.decodeIfPresent(String.self, forKey: .notes)
        supplier = try c.decodeIfPresent(NamedRow.self, forKey: .supplier)
        contract = try c.decodeIfPresent(ContractRow.self, forKey: .contract)

        func date(_ key: CodingKeys) throws -> Date? {
            guard let raw = try c.decodeIfPresent(String.self, forKey: key) else { return nil }
            return Format.parseDate(raw)
        }
        warrantyEndDate = try date(.warrantyEndDate)
        receptionDate = try date(.receptionDate)
        updatedAt = try date(.updatedAt)
    }

    /// Caractéristiques techniques sur une ligne, comme sur la fiche web.
    var specifications: String? {
        let parts = [cpu, memory, storage].compactMap { $0 }.filter { !$0.isEmpty }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }
}

/// Statuts, états et provenances du stock, repris des tables de configuration
/// de `stockService.ts` pour que les deux applications nomment pareil.
enum StockVocabulary {

    static let statuses: [(code: String, label: String, tint: Color)] = [
        ("ordered", "Commandé", Theme.sky),
        ("in_stock", "En stock", Theme.emerald),
        ("reserved", "Réservé", Theme.amber),
        ("assigned", "Attribué", Theme.violet),
        ("in_repair", "En réparation", Theme.amber),
        ("sold", "Vendu", Theme.mutedForeground),
        ("scrapped", "Rebut", Theme.destructive),
    ]

    static func statusLabel(_ code: String) -> String {
        statuses.first { $0.code == code }?.label
            ?? code.replacingOccurrences(of: "_", with: " ").capitalized
    }

    static func statusTint(_ code: String) -> Color {
        statuses.first { $0.code == code }?.tint ?? Theme.mutedForeground
    }

    static func statusIcon(_ code: String) -> String {
        switch code {
        case "ordered":    return "shippingbox.fill"
        case "in_stock":   return "checkmark.circle.fill"
        case "reserved":   return "lock.fill"
        case "assigned":   return "person.fill.checkmark"
        case "in_repair":  return "wrench.and.screwdriver.fill"
        case "sold":       return "eurosign.circle.fill"
        case "scrapped":   return "trash.fill"
        default:           return "cube.box.fill"
        }
    }

    static func conditionLabel(_ code: String?) -> String {
        switch code {
        case "new":       return "Neuf"
        case "like_new":  return "Comme neuf"
        case "good":      return "Bon état"
        case "fair":      return "État moyen"
        case "defective": return "Défectueux"
        case let other?:  return other.capitalized
        case nil:         return "—"
        }
    }

    static func sourceLabel(_ code: String?) -> String {
        switch code {
        case "purchase":          return "Achat"
        case "contract_buyback":  return "Reprise contrat"
        case "contract_swap":     return "Swap contrat"
        case let other?:          return other.replacingOccurrences(of: "_", with: " ").capitalized
        case nil:                 return "—"
        }
    }
}

// MARK: - Écran

@MainActor
@Observable
final class StockStore {
    private(set) var items: [StockItem] = []
    private(set) var isLoading = false
    var errorMessage: String?
    var search = ""
    var status: String = "all"

    func load() async {
        isLoading = true
        defer { isLoading = false }

        guard let companyId = await Session.shared.resolve() else {
            errorMessage = "Société introuvable."
            return
        }

        do {
            items = try await Backend.client
                .from("stock_items")
                .select(StockItem.columns)
                .eq("company_id", value: companyId)
                .order("updated_at", ascending: false)
                .limit(500)
                .execute()
                .value
            errorMessage = nil
        } catch {
            items = []
            errorMessage = "Impossible de charger le stock."
        }
    }

    func count(for code: String) -> Int {
        code == "all" ? items.count : items.filter { $0.status == code }.count
    }

    var filtered: [StockItem] {
        var result = status == "all" ? items : items.filter { $0.status == status }

        if !search.isEmpty {
            let q = search.lowercased()
            result = result.filter {
                $0.title.lowercased().contains(q)
                    || ($0.serialNumber?.lowercased().contains(q) ?? false)
                    || ($0.brand?.lowercased().contains(q) ?? false)
                    || ($0.model?.lowercased().contains(q) ?? false)
                    || ($0.location?.lowercased().contains(q) ?? false)
            }
        }

        return result
    }

    /// Valeur immobilisée : ce que coûte le stock disponible ou réservé.
    var heldValue: Double {
        items
            .filter { ["in_stock", "reserved", "ordered", "in_repair"].contains($0.status) }
            .reduce(0) { $0 + $1.purchasePrice * Double($1.quantity) }
    }
}

struct StockView: View {

    /// Poussé depuis « Plus » : la pile de navigation existe déjà.
    var embedded = false

    @State private var store = StockStore()

    var body: some View {
        if embedded { content } else { NavigationStack { content } }
    }

    private var content: some View {
        VStack(spacing: 0) {
            statusBar

            Group {
                if store.items.isEmpty && store.isLoading {
                    ProgressView().tint(Theme.mutedForeground)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if store.filtered.isEmpty {
                    VStack(spacing: 14) {
                        if let error = store.errorMessage {
                            ErrorBanner(message: error).padding(.horizontal, 20)
                        }
                        EmptyHint(icon: "shippingbox", label: "Aucun article")
                    }
                } else {
                    list
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("Stock")
        .navigationBarTitleDisplayMode(embedded ? .inline : .large)
        .toolbar { if !embedded { ProfileMenu() } }
        .searchable(text: Bindable(store).search, prompt: "Article, n° de série ou emplacement")
        .refreshable { await store.load() }
        .task { if store.items.isEmpty { await store.load() } }
    }

    private var statusBar: some View {
        VStack(spacing: 10) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    StockChip(
                        label: "Tout",
                        count: store.count(for: "all"),
                        tint: Theme.primary,
                        isSelected: store.status == "all"
                    ) { store.status = "all" }

                    // On n'affiche que les statuts réellement présents : une
                    // barre pleine de zéros n'apprend rien.
                    ForEach(StockVocabulary.statuses.filter { store.count(for: $0.code) > 0 }, id: \.code) { entry in
                        StockChip(
                            label: entry.label,
                            count: store.count(for: entry.code),
                            tint: entry.tint,
                            isSelected: store.status == entry.code
                        ) { store.status = entry.code }
                    }
                }
                .padding(.horizontal, 20)
            }

            if store.heldValue > 0 {
                HStack {
                    Text("Valeur immobilisée")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.mutedForeground)
                    Spacer()
                    Text(Format.currency(store.heldValue))
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(Theme.primary)
                }
                .padding(.horizontal, 20)
            }
        }
        .padding(.vertical, 10)
    }

    private var list: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                ForEach(store.filtered) { item in
                    NavigationLink {
                        StockItemDetailView(item: item)
                    } label: {
                        StockRow(item: item)
                    }
                    .buttonStyle(PressableStyle())
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
    }
}

struct StockChip: View {
    let label: String
    let count: Int
    let tint: Color
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            withAnimation(.easeOut(duration: 0.18)) { action() }
        } label: {
            HStack(spacing: 6) {
                Text(label).font(.system(size: 13, weight: .semibold))
                Text("\(count)")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(isSelected ? .white : tint)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(
                        Capsule().fill(isSelected ? Color.white.opacity(0.28) : tint.opacity(0.16))
                    )
            }
            .foregroundStyle(isSelected ? .white : Theme.mutedForeground)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Capsule().fill(isSelected ? tint : Theme.surface))
        }
        .buttonStyle(PressableStyle())
    }
}

struct StockRow: View {
    let item: StockItem

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: StockVocabulary.statusIcon(item.status))
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 34, height: 34)
                        .background(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(StockVocabulary.statusTint(item.status))
                        )

                    VStack(alignment: .leading, spacing: 3) {
                        Text(item.title)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Theme.foreground)
                            .multilineTextAlignment(.leading)
                            .lineLimit(2)

                        if let specs = item.specifications {
                            Text(specs)
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.mutedForeground)
                        }

                        // Le numéro de série est ce qui identifie l'appareil
                        // physique : il vaut mieux que le nom du modèle.
                        if let serial = item.serialNumber, !serial.isEmpty {
                            Text(serial)
                                .font(.system(size: 12, design: .monospaced))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }

                    Spacer(minLength: 4)

                    VStack(alignment: .trailing, spacing: 5) {
                        Text(StockVocabulary.statusLabel(item.status))
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(StockVocabulary.statusTint(item.status))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(
                                Capsule().fill(StockVocabulary.statusTint(item.status).opacity(0.15))
                            )

                        if item.quantity > 1 {
                            Text("×\(item.quantity)")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }
                }

                if item.purchasePrice > 0 || item.location != nil || item.contract != nil {
                    Divider().overlay(Theme.border)

                    HStack(spacing: 10) {
                        if item.purchasePrice > 0 {
                            Text(Format.currency(item.purchasePrice))
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Theme.foreground)
                        }

                        if let contract = item.contract, let client = contract.clientName {
                            Label(client, systemImage: "person.fill")
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.violet)
                                .lineLimit(1)
                        } else if let location = item.location, !location.isEmpty {
                            Label(location, systemImage: "mappin")
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.mutedForeground)
                                .lineLimit(1)
                        }

                        Spacer(minLength: 0)
                    }
                }
            }
        }
    }
}

// MARK: - Fiche article

struct StockItemDetailView: View {
    let item: StockItem

    @State private var movements: [StockMovement] = []

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                HighlightCard(
                    label: StockVocabulary.statusLabel(item.status),
                    value: Format.currency(item.purchasePrice),
                    tint: StockVocabulary.statusTint(item.status)
                )

                Card {
                    VStack(spacing: 0) {
                        DetailRow(label: "Article", value: item.title)
                        if let serial = item.serialNumber, !serial.isEmpty {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "N° de série", value: serial)
                        }
                        if let specs = item.specifications {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Configuration", value: specs)
                        }
                        if let brand = item.brand, !brand.isEmpty {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Marque", value: brand)
                        }
                        if let model = item.model, !model.isEmpty {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Modèle", value: model)
                        }
                        Divider().overlay(Theme.border)
                        DetailRow(label: "État", value: StockVocabulary.conditionLabel(item.condition))
                        if let grade = item.grade, !grade.isEmpty {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Grade", value: grade)
                        }
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Provenance", value: StockVocabulary.sourceLabel(item.source))
                        if item.quantity > 1 {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Quantité", value: "\(item.quantity)")
                        }
                    }
                }

                Card {
                    VStack(spacing: 0) {
                        DetailRow(label: "Prix d'achat", value: Format.currency(item.purchasePrice), emphasis: true)
                        if item.unitPrice > 0 {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Prix unitaire", value: Format.currency(item.unitPrice))
                        }
                        if let buyback = item.buybackPrice, buyback > 0 {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Prix de reprise", value: Format.currency(buyback))
                        }
                        if let supplier = item.supplier?.name, !supplier.isEmpty {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Fournisseur", value: supplier)
                        }
                        if let reception = item.receptionDate {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Réception", value: Format.date(reception))
                        }
                        if let warranty = item.warrantyEndDate {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Fin de garantie", value: Format.date(warranty))
                        }
                        if let location = item.location, !location.isEmpty {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Emplacement", value: location)
                        }
                    }
                }

                // Le contrat rattaché dit à qui l'appareil est physiquement
                // sorti : c'est la question qu'on se pose devant l'étagère vide.
                if let contract = item.contract,
                   contract.clientName != nil || contract.contractNumber != nil {
                    Card {
                        VStack(spacing: 0) {
                            if let client = contract.clientName {
                                DetailRow(label: "Attribué à", value: client)
                            }
                            if let number = contract.contractNumber {
                                Divider().overlay(Theme.border)
                                DetailRow(label: "N° de contrat", value: number)
                            }
                        }
                    }
                }

                if let notes = item.notes, !notes.isEmpty {
                    Card {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Notes")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(Theme.foreground)
                            Text(notes)
                                .font(.system(size: 15))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }
                }

                if !movements.isEmpty {
                    SectionHeader(title: "Mouvements", count: movements.count)

                    ForEach(movements) { movement in
                        Card {
                            VStack(alignment: .leading, spacing: 6) {
                                HStack(spacing: 8) {
                                    Image(systemName: movement.icon)
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundStyle(.white)
                                        .frame(width: 24, height: 24)
                                        .background(Circle().fill(movement.tint))

                                    Text(movement.label)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(Theme.foreground)

                                    Spacer()

                                    Text(Format.date(movement.createdAt))
                                        .font(.system(size: 12))
                                        .foregroundStyle(Theme.mutedForeground)
                                }

                                if let notes = movement.notes, !notes.isEmpty {
                                    Text(notes)
                                        .font(.system(size: 13))
                                        .foregroundStyle(Theme.mutedForeground)
                                }
                            }
                        }
                    }
                }
            }
            .padding(20)
            .frame(maxWidth: 700)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle(item.title)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            movements = (try? await Backend.client
                .from("stock_movements")
                .select("id, movement_type, from_status, to_status, notes, created_at")
                .eq("stock_item_id", value: item.id)
                .order("created_at", ascending: false)
                .limit(50)
                .execute().value) ?? []
        }
    }
}

/// Mouvement de stock : c'est la traçabilité de l'appareil.
struct StockMovement: Decodable, Identifiable, Sendable {
    let id: String
    let movementType: String
    let fromStatus: String?
    let toStatus: String?
    let notes: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, notes
        case movementType = "movement_type"
        case fromStatus = "from_status"
        case toStatus = "to_status"
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        movementType = try c.decodeIfPresent(String.self, forKey: .movementType) ?? ""
        fromStatus = try c.decodeIfPresent(String.self, forKey: .fromStatus)
        toStatus = try c.decodeIfPresent(String.self, forKey: .toStatus)
        notes = try c.decodeIfPresent(String.self, forKey: .notes)
        if let raw = try c.decodeIfPresent(String.self, forKey: .createdAt) {
            createdAt = Format.parseDate(raw)
        } else { createdAt = nil }
    }

    var label: String {
        switch movementType {
        case "reception":          return "Réception"
        case "assign_contract":    return "Attribué à un contrat"
        case "unassign_contract":  return "Retiré d'un contrat"
        case "swap_out":           return "Sorti par échange"
        case "swap_in":            return "Entré par échange"
        case "repair_start":       return "Départ en réparation"
        case "repair_end":         return "Retour de réparation"
        case "scrap":              return "Mis au rebut"
        case "sell":               return "Vendu"
        case "rachat_client":      return "Racheté par le client"
        case "contract_buyback":   return "Repris en fin de contrat"
        case "reserve_offer":      return "Réservé pour une demande"
        case "release_offer":      return "Réservation libérée"
        default:                   return movementType.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    var icon: String {
        switch movementType {
        case "reception", "swap_in":                 return "arrow.down.circle.fill"
        case "assign_contract":                      return "person.fill.checkmark"
        case "unassign_contract", "release_offer":   return "arrow.uturn.backward"
        case "swap_out":                             return "arrow.up.circle.fill"
        case "repair_start", "repair_end":           return "wrench.and.screwdriver.fill"
        case "scrap":                                return "trash.fill"
        case "sell", "rachat_client":                return "eurosign.circle.fill"
        case "contract_buyback":                     return "arrow.triangle.2.circlepath"
        case "reserve_offer":                        return "lock.fill"
        default:                                     return "clock"
        }
    }

    var tint: Color {
        switch movementType {
        case "reception", "swap_in", "repair_end":   return Theme.emerald
        case "assign_contract":                      return Theme.violet
        case "reserve_offer":                        return Theme.amber
        case "scrap":                                return Theme.destructive
        case "sell", "rachat_client":                return Theme.teal
        default:                                     return Theme.sky
        }
    }
}
