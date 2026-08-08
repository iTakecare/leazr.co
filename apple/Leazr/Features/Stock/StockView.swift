import Foundation
import Observation
import SwiftUI
import Supabase

@MainActor
@Observable
final class StockStore {

    private(set) var items: [StockItem] = []
    private(set) var repairs: [StockRepair] = []
    private(set) var movements: [GlobalMovement] = []
    private(set) var buybackable: [BuybackableEquipment] = []
    private(set) var suppliers: [ContractService.Supplier] = []
    private(set) var companyId: String?
    private(set) var isLoading = false
    var errorMessage: String?

    var search = ""
    var status = "all"

    func load() async {
        isLoading = true
        defer { isLoading = false }

        guard let companyId = await Session.shared.resolve() else {
            errorMessage = "Société introuvable."
            return
        }
        self.companyId = companyId

        async let itemsTask = StockService.items(companyId: companyId)
        async let repairsTask = StockService.repairs(companyId: companyId)
        async let movementsTask = StockService.movements(companyId: companyId)
        async let buybackTask = StockService.buybackable(companyId: companyId)
        async let suppliersTask = ContractService.suppliers(companyId: companyId)

        items = await itemsTask
        repairs = await repairsTask
        movements = await movementsTask
        buybackable = await buybackTask
        suppliers = await suppliersTask
        errorMessage = nil
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

    /// Valeur immobilisée : ce que coûte le stock encore détenu.
    var heldValue: Double {
        items
            .filter { ["in_stock", "reserved", "ordered", "in_repair", "assigned"].contains($0.status) }
            .reduce(0) { $0 + $1.purchasePrice * Double($1.quantity) }
    }

    var openRepairs: Int { repairs.filter(\.isOpen).count }
}

// MARK: - Écran

struct StockView: View {

    /// Poussé depuis « Plus » : la pile de navigation existe déjà.
    var embedded = false

    @State private var store = StockStore()
    @State private var section: Section = .items
    @State private var isCreating = false
    @State private var exportURL: URL?

    enum Section: String, CaseIterable, Identifiable {
        case dashboard = "Vue"
        case items = "Articles"
        case buyback = "Rachetables"
        case repairs = "Réparations"
        case movements = "Mouvements"
        case valuation = "Valorisation"

        var id: String { rawValue }

        var icon: String {
            switch self {
            case .dashboard: return "square.grid.2x2"
            case .items:     return "cube.box"
            case .buyback:   return "arrow.triangle.2.circlepath"
            case .repairs:   return "wrench.and.screwdriver"
            case .movements: return "clock.arrow.circlepath"
            case .valuation: return "chart.pie"
            }
        }
    }

    var body: some View {
        if embedded { content } else { NavigationStack { content } }
    }

    private var content: some View {
        VStack(spacing: 0) {
            sectionBar

            Group {
                switch section {
                case .dashboard:
                    StockDashboardSection(
                        items: store.items,
                        repairs: store.repairs,
                        buybackable: store.buybackable
                    )
                case .items:
                    itemsSection
                case .buyback:
                    BuybackableSection(equipments: store.buybackable) { await store.load() }
                case .repairs:
                    RepairsSection(
                        repairs: store.repairs,
                        companyId: store.companyId
                    ) { await store.load() }
                case .movements:
                    MovementsSection(movements: store.movements)
                case .valuation:
                    StockValuationSection(items: store.items)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("Stock")
        .navigationBarTitleDisplayMode(embedded ? .inline : .large)
        .toolbar {
            if !embedded { ProfileMenu() }
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button { isCreating = true } label: {
                    Image(systemName: "plus.circle.fill").font(.system(size: 20))
                }
                Button {
                    exportURL = StockService.exportCSV(store.filtered)
                } label: {
                    Image(systemName: "square.and.arrow.up").font(.system(size: 17))
                }
            }
        }
        .sheet(isPresented: $isCreating) {
            StockItemFormSheet(
                companyId: store.companyId,
                item: nil,
                suppliers: store.suppliers
            ) { await store.load() }
        }
        .sheet(item: Binding(
            get: { exportURL.map(ExportFile.init) },
            set: { if $0 == nil { exportURL = nil } }
        )) { file in
            ShareSheet(url: file.url).presentationDetents([.medium])
        }
        .searchable(text: Bindable(store).search, prompt: "Article, n° de série ou emplacement")
        .refreshable { await store.load() }
        .task { if store.items.isEmpty { await store.load() } }
    }

    private var sectionBar: some View {
        VStack(spacing: 10) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 7) {
                    ForEach(Section.allCases) { item in
                        let isActive = section == item
                        Button {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            withAnimation(.easeOut(duration: 0.16)) { section = item }
                        } label: {
                            HStack(spacing: 5) {
                                Image(systemName: item.icon).font(.system(size: 11, weight: .semibold))
                                Text(item.rawValue).font(.system(size: 13, weight: .semibold))

                                // Deux files appellent une action : ce qu'il y a
                                // à reprendre, et ce qui est en réparation.
                                if item == .buyback, !store.buybackable.isEmpty {
                                    badge(store.buybackable.count, isActive: isActive, tint: Theme.violet)
                                }
                                if item == .repairs, store.openRepairs > 0 {
                                    badge(store.openRepairs, isActive: isActive, tint: Theme.amber)
                                }
                            }
                            .foregroundStyle(isActive ? .white : Theme.mutedForeground)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Capsule().fill(isActive ? Theme.primary : Theme.surface))
                        }
                        .buttonStyle(PressableStyle())
                    }
                }
                .padding(.horizontal, 20)
            }

            if section == .items {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        StockChip(
                            label: "Tout",
                            count: store.count(for: "all"),
                            tint: Theme.primary,
                            isSelected: store.status == "all"
                        ) { store.status = "all" }

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
        }
        .padding(.vertical, 10)
    }

    private func badge(_ count: Int, isActive: Bool, tint: Color) -> some View {
        Text("\(count)")
            .font(.system(size: 10, weight: .bold))
            .foregroundStyle(isActive ? Theme.primary : .white)
            .padding(.horizontal, 5)
            .padding(.vertical, 1)
            .background(Capsule().fill(isActive ? Color.white : tint))
    }

    @ViewBuilder
    private var itemsSection: some View {
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
            ScrollView {
                LazyVStack(spacing: 10) {
                    ForEach(store.filtered) { item in
                        NavigationLink {
                            StockItemDetailView(itemId: item.id, store: store)
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
}

// MARK: - Fiche article

struct StockItemDetailView: View {

    let itemId: String
    @Bindable var store: StockStore

    @Environment(\.dismiss) private var dismiss

    @State private var item: StockItem?
    @State private var movements: [StockMovement] = []
    @State private var isEditing = false
    @State private var isRepairing = false
    @State private var isDeleting = false
    @State private var isLoading = false

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let item {
                    HighlightCard(
                        label: StockVocabulary.statusLabel(item.status),
                        value: Format.currency(item.purchasePrice),
                        tint: StockVocabulary.statusTint(item.status)
                    )

                    identity(item)
                    logistics(item)

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

                    StockCostsSection(item: item, companyId: store.companyId)

                    if let notes = item.notes, !notes.isEmpty {
                        Card {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Notes")
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(Theme.foreground)
                                Text(notes)
                                    .font(.system(size: 14))
                                    .foregroundStyle(Theme.mutedForeground)
                            }
                        }
                    }

                    actions(item)
                    history
                } else if isLoading {
                    ProgressView().tint(Theme.mutedForeground).padding(.top, 40)
                } else {
                    EmptyHint(icon: "shippingbox", label: "Article introuvable")
                }
            }
            .padding(20)
            .frame(maxWidth: 700)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle(item?.title ?? "Article")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { isEditing = true } label: {
                    Image(systemName: "square.and.pencil").font(.system(size: 17))
                }
            }
        }
        .sheet(isPresented: $isEditing) {
            StockItemFormSheet(
                companyId: store.companyId,
                item: item,
                suppliers: store.suppliers
            ) { await reload() }
        }
        .sheet(isPresented: $isRepairing) {
            if let item {
                StartRepairSheet(
                    item: item,
                    companyId: store.companyId,
                    suppliers: store.suppliers
                ) { await reload() }
            }
        }
        .alert("Supprimer cet article ?", isPresented: $isDeleting) {
            Button("Annuler", role: .cancel) {}
            Button("Supprimer", role: .destructive) {
                Task {
                    if await StockService.deleteItem(id: itemId) {
                        await store.load()
                        dismiss()
                    }
                }
            }
        }
        .task { await reload() }
        .refreshable { await reload() }
    }

    private func identity(_ item: StockItem) -> some View {
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
    }

    private func logistics(_ item: StockItem) -> some View {
        Card {
            VStack(spacing: 0) {
                if let supplier = item.supplier?.name, !supplier.isEmpty {
                    DetailRow(label: "Fournisseur", value: supplier)
                    Divider().overlay(Theme.border)
                }
                if let buyback = item.buybackPrice, buyback > 0 {
                    DetailRow(label: "Prix de reprise", value: Format.currency(buyback))
                    Divider().overlay(Theme.border)
                }
                if let reception = item.receptionDate {
                    DetailRow(label: "Réception", value: Format.date(reception))
                    Divider().overlay(Theme.border)
                }
                if let warranty = item.warrantyEndDate {
                    DetailRow(label: "Fin de garantie", value: Format.date(warranty))
                    Divider().overlay(Theme.border)
                }
                DetailRow(label: "Emplacement", value: item.location ?? "Non défini")
            }
        }
    }

    @ViewBuilder
    private func actions(_ item: StockItem) -> some View {
        SectionHeader(title: "Actions")

        VStack(spacing: 8) {
            if item.status != "in_repair" {
                ActionRow(
                    icon: "wrench.and.screwdriver.fill",
                    tint: Theme.amber,
                    title: "Envoyer en réparation",
                    subtitle: "Crée une fiche et trace le départ"
                ) { isRepairing = true }
            }

            if item.status == "in_stock" {
                ActionRow(
                    icon: "eurosign.circle.fill",
                    tint: Theme.teal,
                    title: "Marquer vendu",
                    subtitle: "Sort l'appareil du stock"
                ) {
                    Task { await change(item, to: "sold", movement: "sell", notes: "Vendu") }
                }
            }

            if item.status != "scrapped" {
                ActionRow(
                    icon: "trash.slash.fill",
                    tint: Theme.destructive,
                    title: "Mettre au rebut",
                    subtitle: "Appareil hors d'usage"
                ) {
                    Task { await change(item, to: "scrapped", movement: "scrap", notes: "Mis au rebut") }
                }
            }

            ActionRow(
                icon: "trash.fill",
                tint: Theme.destructive,
                title: "Supprimer l'article",
                subtitle: "Efface la fiche et son historique"
            ) { isDeleting = true }
        }
    }

    @ViewBuilder
    private var history: some View {
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

    private func change(_ item: StockItem, to status: String, movement: String, notes: String) async {
        guard let companyId = store.companyId else { return }
        if await StockService.changeStatus(
            item: item,
            companyId: companyId,
            to: status,
            movementType: movement,
            notes: notes
        ) {
            await reload()
        }
    }

    private func reload() async {
        isLoading = true
        defer { isLoading = false }
        item = await StockService.item(id: itemId)
        movements = (try? await Backend.client
            .from("stock_movements")
            .select("id, movement_type, from_status, to_status, notes, created_at")
            .eq("stock_item_id", value: itemId)
            .order("created_at", ascending: false)
            .limit(50)
            .execute().value) ?? []
        await store.load()
    }
}
