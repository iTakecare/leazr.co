import Foundation
import Observation
import SwiftUI
import Supabase

@MainActor
@Observable
final class ContractsStore {

    private(set) var contracts: [Contract] = []
    private(set) var isLoading = false
    var errorMessage: String?
    var search = ""

    /// Filtres avancés, repris de `ContractsAdvancedFilters`.
    var status: String = "all"
    var leaser: String = "all"
    var minMonthly: Double?
    var maxMonthly: Double?
    var duration: Int?
    var startFrom: Date?
    var startTo: Date?

    func load() async {
        isLoading = true
        defer { isLoading = false }

        do {
            contracts = try await Backend.client
                .from("contracts")
                .select("""
                    id, client_name, monthly_payment, status, leaser_name, contract_number, \
                    equipment_description, created_at, contract_duration, contract_start_date
                    """)
                .order("created_at", ascending: false)
                .limit(300)
                .execute()
                .value
            errorMessage = nil
        } catch {
            contracts = []
            errorMessage = "Impossible de charger les contrats."
        }
    }

    var leasers: [String] {
        Array(Set(contracts.map(\.leaserName))).sorted()
    }

    func count(for status: String) -> Int {
        status == "all"
            ? contracts.count
            : contracts.filter { $0.status == status }.count
    }

    var filtered: [Contract] {
        var result = contracts

        if status != "all" {
            result = result.filter { $0.status == status }
        }
        if leaser != "all" {
            result = result.filter { $0.leaserName == leaser }
        }
        if let minMonthly {
            result = result.filter { $0.monthlyPayment >= minMonthly }
        }
        if let maxMonthly {
            result = result.filter { $0.monthlyPayment <= maxMonthly }
        }
        if let duration {
            result = result.filter { $0.contractDuration == duration }
        }
        if let startFrom {
            result = result.filter { ($0.contractStartDate ?? .distantPast) >= startFrom }
        }
        if let startTo {
            result = result.filter { ($0.contractStartDate ?? .distantFuture) <= startTo }
        }

        if !search.isEmpty {
            let q = search.lowercased()
            result = result.filter {
                $0.clientName.lowercased().contains(q)
                    || ($0.contractNumber?.lowercased().contains(q) ?? false)
                    || $0.leaserName.lowercased().contains(q)
            }
        }

        return result
    }

    var hasAdvancedFilter: Bool {
        leaser != "all" || minMonthly != nil || maxMonthly != nil
            || duration != nil || startFrom != nil || startTo != nil
    }

    func resetAdvancedFilters() {
        leaser = "all"
        minMonthly = nil
        maxMonthly = nil
        duration = nil
        startFrom = nil
        startTo = nil
    }

    /// Loyers mensuels de la sélection : l'indicateur qui compte sur un
    /// portefeuille de contrats.
    var monthlyTotal: Double {
        filtered.reduce(0) { $0 + $1.monthlyPayment }
    }
}

struct ContractsView: View {

    /// Poussé depuis « Plus » : la pile de navigation existe déjà.
    var embedded = false

    @State private var store = ContractsStore()
    @State private var isKanban = false
    @State private var isFiltering = false
    @State private var navigation: ContractRoute?

    var body: some View {
        if embedded { content } else { NavigationStack { content } }
    }

    private var content: some View {
        VStack(spacing: 0) {
            statusBar

            Group {
                if store.contracts.isEmpty && store.isLoading {
                    ProgressView().tint(Theme.mutedForeground)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if store.filtered.isEmpty {
                    VStack(spacing: 14) {
                        if let error = store.errorMessage {
                            ErrorBanner(message: error).padding(.horizontal, 20)
                        }
                        EmptyHint(icon: "doc.badge.clock", label: "Aucun contrat")
                        if store.hasAdvancedFilter {
                            Button("Réinitialiser les filtres") { store.resetAdvancedFilters() }
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(Theme.primary)
                        }
                    }
                } else if isKanban {
                    ContractsKanbanView(contracts: store.filtered) {
                        navigation = ContractRoute(contract: $0)
                    }
                } else {
                    list
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("Contrats")
        .navigationBarTitleDisplayMode(embedded ? .inline : .large)
        .toolbar {
            if !embedded { ProfileMenu() }
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    withAnimation(.easeOut(duration: 0.2)) { isKanban.toggle() }
                } label: {
                    Image(systemName: isKanban ? "list.bullet" : "rectangle.split.3x1")
                        .font(.system(size: 17))
                }
                Button { isFiltering = true } label: {
                    Image(systemName: store.hasAdvancedFilter
                        ? "line.3.horizontal.decrease.circle.fill"
                        : "line.3.horizontal.decrease.circle")
                        .font(.system(size: 19))
                }
            }
        }
        .navigationDestination(item: $navigation) { route in
            ContractDetailView(contract: route.contract)
        }
        .sheet(isPresented: $isFiltering) {
            ContractFilterSheet(store: store)
                .presentationDetents([.medium, .large])
        }
        .searchable(text: Bindable(store).search, prompt: "Client, n° de contrat ou bailleur")
        .refreshable { await store.load() }
        .task { if store.contracts.isEmpty { await store.load() } }
    }

    private var statusBar: some View {
        VStack(spacing: 10) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    StockChip(
                        label: "Tous",
                        count: store.count(for: "all"),
                        tint: Theme.primary,
                        isSelected: store.status == "all"
                    ) { store.status = "all" }

                    ForEach(ContractWorkflow.steps) { step in
                        let count = store.count(for: step.id)
                        if count > 0 {
                            StockChip(
                                label: step.label,
                                count: count,
                                tint: ContractWorkflow.tint(step.id),
                                isSelected: store.status == step.id
                            ) { store.status = step.id }
                        }
                    }
                }
                .padding(.horizontal, 20)
            }

            if store.monthlyTotal > 0 {
                HStack {
                    Text("Loyers mensuels")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.mutedForeground)
                    Spacer()
                    Text(Format.currency(store.monthlyTotal))
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
                ForEach(store.filtered) { contract in
                    NavigationLink {
                        ContractDetailView(contract: contract)
                    } label: {
                        ContractRow(contract: contract)
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

struct ContractRow: View {
    let contract: Contract

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(contract.clientName)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Theme.foreground)
                            .lineLimit(1)
                        Text(contract.contractNumber ?? contract.leaserName)
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.mutedForeground)
                    }
                    Spacer(minLength: 8)
                    StatusBadge(
                        label: ContractWorkflow.label(contract.status),
                        status: contract.status
                    )
                }

                Divider().overlay(Theme.border)

                HStack {
                    Text(Format.currency(contract.monthlyPayment))
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.foreground)

                    if let duration = contract.contractDuration {
                        Text("sur \(duration) mois")
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.mutedForeground)
                    }

                    Spacer()

                    if let start = contract.contractStartDate {
                        Text("Début \(Format.date(start))")
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.mutedForeground)
                    }
                }
            }
        }
    }
}

// MARK: - Kanban

struct ContractsKanbanView: View {

    let contracts: [Contract]
    let onOpen: (Contract) -> Void

    private var columns: [(step: ContractWorkflow.Step, items: [Contract])] {
        ContractWorkflow.steps.compactMap { step in
            let items = contracts.filter { $0.status == step.id }
            return items.isEmpty ? nil : (step, items)
        }
    }

    var body: some View {
        if columns.isEmpty {
            EmptyHint(icon: "rectangle.split.3x1", label: "Aucun contrat à afficher")
        } else {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .top, spacing: 12) {
                    ForEach(columns, id: \.step.id) { column in
                        VStack(alignment: .leading, spacing: 10) {
                            HStack(spacing: 7) {
                                Circle()
                                    .fill(ContractWorkflow.tint(column.step.id))
                                    .frame(width: 8, height: 8)
                                Text(column.step.label)
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundStyle(Theme.foreground)
                                Text("\(column.items.count)")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundStyle(ContractWorkflow.tint(column.step.id))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(
                                        Capsule().fill(ContractWorkflow.tint(column.step.id).opacity(0.16))
                                    )
                                Spacer(minLength: 0)
                            }

                            let total = column.items.reduce(0) { $0 + $1.monthlyPayment }
                            if total > 0 {
                                Text("\(Format.currency(total))/mois")
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(Theme.mutedForeground)
                            }

                            ScrollView(showsIndicators: false) {
                                LazyVStack(spacing: 8) {
                                    ForEach(column.items) { contract in
                                        Button {
                                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                            onOpen(contract)
                                        } label: {
                                            VStack(alignment: .leading, spacing: 6) {
                                                Text(contract.clientName)
                                                    .font(.system(size: 14, weight: .semibold))
                                                    .foregroundStyle(Theme.foreground)
                                                    .multilineTextAlignment(.leading)
                                                    .lineLimit(2)
                                                if let number = contract.contractNumber {
                                                    Text(number)
                                                        .font(.system(size: 11))
                                                        .foregroundStyle(Theme.mutedForeground)
                                                }
                                                Text(Format.currency(contract.monthlyPayment))
                                                    .font(.system(size: 14, weight: .bold))
                                                    .foregroundStyle(Theme.primary)
                                            }
                                            .padding(11)
                                            .frame(maxWidth: .infinity, alignment: .leading)
                                            .background(
                                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                                    .fill(Theme.surface)
                                            )
                                        }
                                        .buttonStyle(PressableStyle())
                                    }
                                }
                            }
                        }
                        .padding(12)
                        .frame(width: 262)
                        .frame(maxHeight: 560)
                        .background(
                            RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                                .fill(Theme.surface.opacity(0.6))
                        )
                        .overlay(alignment: .top) {
                            Rectangle()
                                .fill(ContractWorkflow.tint(column.step.id))
                                .frame(height: 3)
                        }
                        .clipShape(RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous))
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
            }
        }
    }
}

// MARK: - Filtres avancés

struct ContractFilterSheet: View {

    @Environment(\.dismiss) private var dismiss
    @Bindable var store: ContractsStore

    @State private var minText = ""
    @State private var maxText = ""
    @State private var hasStartFrom = false
    @State private var startFrom = Date()
    @State private var hasStartTo = false
    @State private var startTo = Date()

    private static let durations = [12, 24, 36, 48, 60]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    FormSection(title: "Bailleur") {
                        VStack(spacing: 8) {
                            MotifChoiceRow(label: "Tous", isSelected: store.leaser == "all") {
                                store.leaser = "all"
                            }
                            ForEach(store.leasers, id: \.self) { name in
                                MotifChoiceRow(label: name, isSelected: store.leaser == name) {
                                    store.leaser = name
                                }
                            }
                        }
                    }

                    FormSection(title: "Durée") {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 90), spacing: 8)], spacing: 8) {
                            SelectChip(label: "Toutes", isSelected: store.duration == nil) {
                                store.duration = nil
                            }
                            ForEach(Self.durations, id: \.self) { months in
                                SelectChip(
                                    label: "\(months) mois",
                                    isSelected: store.duration == months
                                ) { store.duration = months }
                            }
                        }
                    }

                    FormSection(title: "Mensualité (€)") {
                        HStack(spacing: 10) {
                            LeazrField(icon: "arrow.down", placeholder: "Min", text: $minText, keyboardType: .decimalPad)
                            LeazrField(icon: "arrow.up", placeholder: "Max", text: $maxText, keyboardType: .decimalPad)
                        }
                    }

                    FormSection(title: "Début du contrat") {
                        VStack(spacing: 10) {
                            Toggle("À partir du", isOn: $hasStartFrom)
                                .tint(Theme.primary)
                                .font(.system(size: 15))
                                .padding(.horizontal, 16)
                                .frame(height: 50)
                                .background(
                                    RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                        .fill(Theme.surface)
                                )
                            if hasStartFrom {
                                DatePicker("", selection: $startFrom, displayedComponents: .date)
                                    .datePickerStyle(.compact)
                                    .labelsHidden()
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(.horizontal, 16)
                                    .frame(height: 54)
                                    .background(
                                        RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                            .fill(Theme.surface)
                                    )
                            }

                            Toggle("Jusqu'au", isOn: $hasStartTo)
                                .tint(Theme.primary)
                                .font(.system(size: 15))
                                .padding(.horizontal, 16)
                                .frame(height: 50)
                                .background(
                                    RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                        .fill(Theme.surface)
                                )
                            if hasStartTo {
                                DatePicker("", selection: $startTo, displayedComponents: .date)
                                    .datePickerStyle(.compact)
                                    .labelsHidden()
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(.horizontal, 16)
                                    .frame(height: 54)
                                    .background(
                                        RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                            .fill(Theme.surface)
                                    )
                            }
                        }
                    }

                    TertiaryButton(title: "Tout réinitialiser", systemImage: "arrow.counterclockwise") {
                        store.resetAdvancedFilters()
                        minText = ""
                        maxText = ""
                        hasStartFrom = false
                        hasStartTo = false
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Filtrer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Terminé") { apply(); dismiss() }.fontWeight(.semibold)
                }
            }
            .onAppear {
                minText = store.minMonthly.map { String(format: "%.0f", $0) } ?? ""
                maxText = store.maxMonthly.map { String(format: "%.0f", $0) } ?? ""
                if let value = store.startFrom { startFrom = value; hasStartFrom = true }
                if let value = store.startTo { startTo = value; hasStartTo = true }
            }
        }
    }

    /// Les bornes numériques ne s'appliquent qu'à la fermeture : filtrer à
    /// chaque frappe ferait clignoter la liste sous le doigt.
    private func apply() {
        store.minMonthly = Double(minText.replacingOccurrences(of: ",", with: "."))
        store.maxMonthly = Double(maxText.replacingOccurrences(of: ",", with: "."))
        store.startFrom = hasStartFrom ? startFrom : nil
        store.startTo = hasStartTo ? startTo : nil
    }
}

/// Destination de navigation vers un contrat depuis le Kanban.
struct ContractRoute: Identifiable, Hashable {
    let contract: Contract
    var id: String { contract.id }

    static func == (lhs: ContractRoute, rhs: ContractRoute) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}
