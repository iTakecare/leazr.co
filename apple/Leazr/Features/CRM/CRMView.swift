import Foundation
import Observation
import SwiftUI
import Supabase

@MainActor
@Observable
final class CRMStore {

    private(set) var stages: [PipelineStage] = []
    private(set) var opportunities: [Opportunity] = []
    private(set) var isLoading = false
    var errorMessage: String?
    var search = ""
    var status: OpportunityStatusFilter = .open
    var overdueOnly = false

    func load() async {
        isLoading = true
        defer { isLoading = false }

        guard let companyId = await Session.shared.resolve() else {
            errorMessage = "Société introuvable."
            return
        }

        async let stagesTask: [PipelineStage] = (try? await Backend.client
            .from("pipeline_stages")
            .select(PipelineStage.columns)
            .eq("company_id", value: companyId)
            .eq("active", value: true)
            .order("position", ascending: true)
            .execute().value) ?? []

        var query = Backend.client
            .from("opportunities")
            .select(Opportunity.columns)
            .eq("company_id", value: companyId)

        if let filter = status.value {
            query = query.eq("status", value: filter)
        }

        do {
            // Les affaires closes se comptent en centaines : le plafond du web
            // vaut aussi ici.
            opportunities = try await query
                .order("updated_at", ascending: false)
                .limit(300)
                .execute()
                .value
            errorMessage = nil
        } catch {
            opportunities = []
            errorMessage = "Impossible de charger les affaires."
        }

        stages = await stagesTask
    }

    var filtered: [Opportunity] {
        var result = opportunities

        if overdueOnly {
            result = result.filter(\.isOverdue)
        }

        if !search.isEmpty {
            let q = search.lowercased()
            result = result.filter {
                $0.name.lowercased().contains(q)
                    || ($0.client?.name.lowercased().contains(q) ?? false)
                    || ($0.client?.company?.lowercased().contains(q) ?? false)
                    || ($0.description?.lowercased().contains(q) ?? false)
            }
        }

        return result
    }

    /// Regroupement par étape, dans l'ordre du pipeline. Les affaires dont
    /// l'étape a été désactivée finissent dans un groupe « Sans étape » plutôt
    /// que de disparaître silencieusement.
    var groups: [(stage: PipelineStage?, items: [Opportunity])] {
        let items = filtered
        var result: [(PipelineStage?, [Opportunity])] = stages.map { stage in
            (stage, items.filter { $0.stageId == stage.id })
        }

        let known = Set(stages.map(\.id))
        let orphans = items.filter { $0.stageId.map { !known.contains($0) } ?? true }
        if !orphans.isEmpty { result.append((nil, orphans)) }

        return result.filter { !$0.1.isEmpty }.map { (stage: $0.0, items: $0.1) }
    }

    /// Valeur du pipeline : somme des mensualités estimées des affaires
    /// ouvertes. C'est l'indicateur que suit le web en tête de page.
    var pipelineValue: Double {
        filtered
            .filter { $0.status == "open" }
            .reduce(0) { $0 + ($1.estimatedMonthlyPayment ?? 0) }
    }

    var overdueCount: Int { opportunities.filter(\.isOverdue).count }
}

enum OpportunityStatusFilter: String, CaseIterable, Identifiable {
    case open, won, lost, all

    var id: String { rawValue }

    var title: String {
        switch self {
        case .open: return "En cours"
        case .won:  return "Gagnées"
        case .lost: return "Perdues"
        case .all:  return "Toutes"
        }
    }

    var tint: Color {
        switch self {
        case .open: return Theme.primary
        case .won:  return Theme.emerald
        case .lost: return Theme.destructive
        case .all:  return Theme.violet
        }
    }

    /// `nil` = pas de filtre côté serveur.
    var value: String? { self == .all ? nil : rawValue }
}

// MARK: - Écran

struct CRMView: View {

    /// Poussé depuis « Plus » : la pile de navigation existe déjà.
    var embedded = false

    @State private var store = CRMStore()
    @State private var isCreating = false

    var body: some View {
        if embedded { content } else { NavigationStack { content } }
    }

    private var content: some View {
        VStack(spacing: 0) {
                statusBar

                Group {
                    if store.opportunities.isEmpty && store.isLoading {
                        ProgressView().tint(Theme.mutedForeground)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if store.groups.isEmpty {
                        VStack(spacing: 14) {
                            if let error = store.errorMessage {
                                ErrorBanner(message: error).padding(.horizontal, 20)
                            }
                            EmptyHint(icon: "chart.line.uptrend.xyaxis", label: "Aucune affaire")
                        }
                    } else {
                        pipeline
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("CRM")
        .navigationBarTitleDisplayMode(embedded ? .inline : .large)
        .toolbar {
            if !embedded { ProfileMenu() }
            ToolbarItem(placement: embedded ? .topBarTrailing : .topBarLeading) {
                Button { isCreating = true } label: {
                    Image(systemName: "plus.circle.fill").font(.system(size: 20))
                }
            }
        }
        .sheet(isPresented: $isCreating) {
            OpportunityFormSheet(stages: store.stages) { Task { await store.load() } }
        }
        .searchable(text: Bindable(store).search, prompt: "Affaire ou client")
        .refreshable { await store.load() }
        .task { if store.opportunities.isEmpty { await store.load() } }
    }

    private var statusBar: some View {
        VStack(spacing: 10) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(OpportunityStatusFilter.allCases) { filter in
                        SelectChip(
                            label: filter.title,
                            isSelected: store.status == filter,
                            tint: filter.tint
                        ) {
                            store.status = filter
                            Task { await store.load() }
                        }
                        .frame(width: 96)
                    }

                    // Les affaires en retard sont la vraie file de travail :
                    // elles méritent un accès direct, pas un filtre enfoui.
                    if store.overdueCount > 0 {
                        SelectChip(
                            label: "En retard (\(store.overdueCount))",
                            systemImage: "exclamationmark.triangle.fill",
                            isSelected: store.overdueOnly,
                            tint: Theme.amber
                        ) {
                            store.overdueOnly.toggle()
                        }
                        .frame(width: 150)
                    }
                }
                .padding(.horizontal, 20)
            }

            if store.pipelineValue > 0 {
                HStack {
                    Text("Pipeline")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.mutedForeground)
                    Spacer()
                    Text("\(Format.currency(store.pipelineValue)) / mois")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(Theme.primary)
                }
                .padding(.horizontal, 20)
            }
        }
        .padding(.vertical, 10)
    }

    private var pipeline: some View {
        ScrollView {
            LazyVStack(spacing: 16, pinnedViews: []) {
                if let error = store.errorMessage {
                    ErrorBanner(message: error)
                }

                ForEach(store.groups, id: \.stage?.id) { group in
                    VStack(spacing: 10) {
                        StageHeader(
                            stage: group.stage,
                            count: group.items.count,
                            total: group.items.reduce(0) { $0 + ($1.estimatedMonthlyPayment ?? 0) }
                        )

                        ForEach(group.items) { opportunity in
                            NavigationLink {
                                OpportunityDetailView(opportunity: opportunity, stages: store.stages) {
                                    await store.load()
                                }
                            } label: {
                                OpportunityRow(opportunity: opportunity)
                            }
                            .buttonStyle(PressableStyle())
                        }
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
    }
}

// MARK: - Composants

struct StageHeader: View {
    let stage: PipelineStage?
    let count: Int
    let total: Double

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(stage?.color ?? Theme.mutedForeground)
                .frame(width: 9, height: 9)

            Text(stage?.label ?? "Sans étape")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(Theme.foreground)

            Text("\(count)")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(stage?.color ?? Theme.mutedForeground)
                .padding(.horizontal, 7)
                .padding(.vertical, 2)
                .background(Capsule().fill((stage?.color ?? Theme.mutedForeground).opacity(0.16)))

            Spacer()

            if total > 0 {
                Text("\(Format.currency(total))/mois")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.mutedForeground)
            }
        }
        .padding(.top, 6)
    }
}

struct OpportunityRow: View {
    let opportunity: Opportunity

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 8) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(opportunity.name)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                        .multilineTextAlignment(.leading)
                        .lineLimit(2)

                    if let client = opportunity.client {
                        Text(client.company ?? client.name)
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.mutedForeground)
                            .lineLimit(1)
                    }
                }

                Spacer(minLength: 0)

                if let monthly = opportunity.estimatedMonthlyPayment, monthly > 0 {
                    Text("\(Format.currency(monthly))/mois")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Theme.primary)
                }
            }

            HStack(spacing: 6) {
                if opportunity.status != "open" {
                    Text(opportunity.statusLabel)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(opportunity.statusTint)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(Capsule().fill(opportunity.statusTint.opacity(0.15)))
                }

                if let next = opportunity.nextActionAt {
                    HStack(spacing: 4) {
                        Image(systemName: opportunity.isOverdue ? "exclamationmark.triangle.fill" : "bell.fill")
                            .font(.system(size: 9, weight: .bold))
                        Text(Format.date(next))
                            .font(.system(size: 11, weight: .semibold))
                    }
                    .foregroundStyle(opportunity.isOverdue ? Theme.destructive : Theme.amber)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 3)
                    .background(
                        Capsule().fill((opportunity.isOverdue ? Theme.destructive : Theme.amber).opacity(0.15))
                    )
                }

                if let score = opportunity.intentScore, score > 0 {
                    Text("Intention \(score)")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Theme.teal)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(Capsule().fill(Theme.teal.opacity(0.15)))
                }

                Spacer(minLength: 0)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                .fill(Theme.surface)
        )
        .overlay(alignment: .leading) {
            // Liseré à la couleur de l'étape : on lit la colonne du pipeline
            // sans avoir à remonter au titre du groupe.
            RoundedRectangle(cornerRadius: 3, style: .continuous)
                .fill(opportunity.stage?.color ?? Theme.border)
                .frame(width: 4)
                .padding(.vertical, 12)
        }
    }
}
