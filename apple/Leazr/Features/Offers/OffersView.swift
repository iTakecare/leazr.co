import Foundation
import Observation
import SwiftUI
import Supabase

@MainActor
@Observable
final class OffersStore {
    private(set) var offers: [Offer] = []
    private(set) var isLoading = false
    var errorMessage: String?
    var search = ""

    /// Filtres, calqués un pour un sur `useOfferFilters.ts`.
    var tab: OfferTab = .inProgress
    var type: OfferTypeFilter = .all
    var source: OfferSourceFilter = .all
    var rejectType: String = "all"
    var motif: String = "all"

    /// Changer d'onglet réinitialise les filtres qui lui sont propres, comme
    /// le fait `setActiveTab` côté web.
    func select(tab newTab: OfferTab) {
        tab = newTab
        rejectType = "all"
        motif = "all"
    }

    /// Les offres visibles sont déjà filtrées par les politiques RLS côté
    /// serveur : inutile de passer un company_id depuis le client.
    func load() async {
        isLoading = true
        defer { isLoading = false }

        do {
            offers = try await Backend.client
                .from("offers")
                .select(Offer.listColumns)
                .order("created_at", ascending: false)
                .limit(300)
                .execute()
                .value
            errorMessage = nil
        } catch {
            errorMessage = "Impossible de charger les offres."
        }
    }

    /// Nombre de dossiers par onglet, avant application des autres filtres :
    /// le compteur doit refléter la charge réelle de chaque file.
    func count(for tab: OfferTab) -> Int {
        offers.filter { tab.matches($0) }.count
    }

    var filtered: [Offer] {
        var result = offers.filter { tab.matches($0) }

        if tab == .rejected, rejectType != "all" {
            result = result.filter {
                ($0.workflowStatus ?? "").trimmingCharacters(in: .whitespaces).lowercased() == rejectType
            }
        }

        if tab == .rejected, motif != "all" {
            result = result.filter { ($0.rejectionCategory ?? "unknown") == motif }
        }

        if type != .all {
            result = result.filter { $0.type == type.rawValue }
        }

        switch source {
        case .all:
            break
        case .meta:
            result = result.filter { $0.source == "meta" }
        case .customPack:
            result = result.filter { $0.source == "custom_pack" }
        case .webCatalog:
            result = result.filter { $0.source != "meta" && $0.source != "custom_pack" }
        }

        if !search.isEmpty {
            let q = search.lowercased()
            result = result.filter {
                $0.clientName.lowercased().contains(q)
                    || ($0.dossierNumber?.lowercased().contains(q) ?? false)
                    || String(format: "%.0f", $0.amount).contains(q)
                    || String(format: "%.0f", $0.monthlyPayment).contains(q)
                    || $0.id.lowercased().contains(q)
            }
        }

        return result
    }

    /// Un filtre secondaire actif mérite d'être signalé : sinon une liste vide
    /// passe pour une absence de dossiers.
    var hasSecondaryFilter: Bool {
        type != .all || source != .all || rejectType != "all" || motif != "all"
    }

    func resetSecondaryFilters() {
        type = .all
        source = .all
        rejectType = "all"
        motif = "all"
    }
}

struct OffersView: View {

    /// Poussé depuis « Plus » : la pile de navigation existe déjà.
    var embedded = false

    @State private var store = OffersStore()
    @State private var isCreating = false
    @State private var isFiltering = false

    var body: some View {
        if embedded { content } else { NavigationStack { content } }
    }

    private var content: some View {
        VStack(spacing: 0) {
                tabBar

                Group {
                    if store.offers.isEmpty && store.isLoading {
                        ProgressView().tint(Theme.mutedForeground)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if store.filtered.isEmpty {
                        emptyState
                    } else {
                        list
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("Demandes")
        .navigationBarTitleDisplayMode(embedded ? .inline : .large)
        .toolbar {
            if !embedded { ProfileMenu() }
            if !embedded {
                ToolbarItem(placement: .topBarLeading) {
                    Button { isCreating = true } label: {
                        Image(systemName: "plus.circle.fill").font(.system(size: 20))
                    }
                }
            }
            ToolbarItemGroup(placement: .topBarTrailing) {
                if embedded {
                    Button { isCreating = true } label: {
                        Image(systemName: "plus.circle.fill").font(.system(size: 20))
                    }
                }
                Button { isFiltering = true } label: {
                    Image(systemName: store.hasSecondaryFilter
                        ? "line.3.horizontal.decrease.circle.fill"
                        : "line.3.horizontal.decrease.circle")
                        .font(.system(size: 19))
                }
            }
        }
        .sheet(isPresented: $isCreating) {
            CreateOfferView { Task { await store.load() } }
        }
        .sheet(isPresented: $isFiltering) {
            OfferFilterSheet(store: store)
                .presentationDetents([.medium, .large])
        }
        .searchable(text: Bindable(store).search, prompt: "Client, n° de dossier ou montant")
        .refreshable { await store.load() }
        .task { if store.offers.isEmpty { await store.load() } }
    }

    // MARK: - Onglets

    /// Les onglets du web transposés en barre défilante : cinq files, chacune
    /// avec son compteur, pour savoir d'un coup d'œil où est la charge.
    private var tabBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(OfferTab.allCases) { tab in
                    let isActive = store.tab == tab
                    Button {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        withAnimation(.easeOut(duration: 0.18)) { store.select(tab: tab) }
                    } label: {
                        HStack(spacing: 6) {
                            Text(tab.title)
                                .font(.system(size: 13, weight: .semibold))
                            Text("\(store.count(for: tab))")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundStyle(isActive ? .white : tab.tint)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(
                                    Capsule().fill(isActive
                                        ? Color.white.opacity(0.28)
                                        : tab.tint.opacity(0.16))
                                )
                        }
                        .foregroundStyle(isActive ? .white : Theme.mutedForeground)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(
                            Capsule().fill(isActive ? tab.tint : Theme.surface)
                        )
                    }
                    .buttonStyle(PressableStyle())
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
        }
    }

    private var list: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                if let error = store.errorMessage {
                    ErrorBanner(message: error)
                }

                ForEach(store.filtered) { offer in
                    NavigationLink {
                        OfferDetailView(offer: offer)
                    } label: {
                        OfferRow(offer: offer)
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

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "tray")
                .font(.system(size: 42, weight: .light))
                .foregroundStyle(Theme.mutedForeground)

            Text(store.search.isEmpty ? "Aucune demande" : "Aucun résultat")
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(Theme.foreground)

            if store.hasSecondaryFilter {
                Button("Réinitialiser les filtres") { store.resetSecondaryFilters() }
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Theme.primary)
            }
        }
    }
}

// MARK: - Filtres secondaires

/// Type, source, et — dans l'onglet « Refusées » — nature et motif du rejet.
struct OfferFilterSheet: View {

    @Environment(\.dismiss) private var dismiss
    @Bindable var store: OffersStore

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    FormSection(title: "Type de demande") {
                        VStack(spacing: 8) {
                            ForEach(OfferTypeFilter.allCases) { option in
                                MotifChoiceRow(
                                    label: option.title,
                                    isSelected: store.type == option
                                ) { store.type = option }
                            }
                        }
                    }

                    FormSection(title: "Source") {
                        VStack(spacing: 8) {
                            ForEach(OfferSourceFilter.allCases) { option in
                                MotifChoiceRow(
                                    label: option.title,
                                    isSelected: store.source == option
                                ) { store.source = option }
                            }
                        }
                    }

                    if store.tab == .rejected {
                        FormSection(title: "Type de rejet") {
                            VStack(spacing: 8) {
                                MotifChoiceRow(
                                    label: "Tous les rejets",
                                    isSelected: store.rejectType == "all"
                                ) { store.rejectType = "all" }
                                MotifChoiceRow(
                                    label: "Rejet interne",
                                    isSelected: store.rejectType == "internal_rejected"
                                ) { store.rejectType = "internal_rejected" }
                                MotifChoiceRow(
                                    label: "Rejet leaser",
                                    isSelected: store.rejectType == "leaser_rejected"
                                ) { store.rejectType = "leaser_rejected" }
                            }
                        }

                        FormSection(title: "Motif du refus") {
                            VStack(spacing: 8) {
                                MotifChoiceRow(
                                    label: "Tous les motifs",
                                    isSelected: store.motif == "all"
                                ) { store.motif = "all" }

                                ForEach(OfferMotif.rejection, id: \.code) { option in
                                    MotifChoiceRow(
                                        label: option.label,
                                        isSelected: store.motif == option.code
                                    ) { store.motif = option.code }
                                }
                            }
                        }
                    }

                    TertiaryButton(title: "Tout réinitialiser", systemImage: "arrow.counterclockwise") {
                        store.resetSecondaryFilters()
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
                    Button("Terminé") { dismiss() }.fontWeight(.semibold)
                }
            }
        }
    }
}

// MARK: - Ligne de liste

struct OfferRow: View {
    let offer: Offer

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(offer.clientName)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                        .lineLimit(1)

                    if let dossier = offer.dossierNumber {
                        Text(dossier)
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.mutedForeground)
                    }
                }

                Spacer(minLength: 8)

                // Un seul badge, mais le bon : le statut du workflow, celui
                // qu'affiche le web. Deux badges concurrents brouillaient la
                // lecture pour la même information.
                StatusBadge(status: offer.currentStep)
            }

            Divider().overlay(Theme.border)

            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Mensualité")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                    Text(Format.currency(offer.monthlyPayment))
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("Montant")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                    Text(Format.currency(offer.amount))
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                }
            }

            HStack(spacing: 8) {
                Text(Format.date(offer.createdAt))
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.mutedForeground)

                Text("·")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.mutedForeground)

                Text(offer.typeLabel)
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.mutedForeground)

                Spacer(minLength: 0)

                if let score = offer.internalScore, !score.isEmpty {
                    ScoreChip(letter: score, family: "I")
                }
                if let score = offer.leaserScore, !score.isEmpty {
                    ScoreChip(letter: score, family: "L")
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                .fill(Theme.surface)
        )
    }
}

/// Badge de statut : libellé français et couleur issus du catalogue partagé
/// avec le web.
struct StatusBadge: View {
    let status: String
    var showIcon = true

    /// Variante utilisée par les documents, qui portent leur propre libellé.
    init(label: String, status: String) {
        self.status = status
        self.explicitLabel = label
        self.showIcon = false
    }

    init(status: String, showIcon: Bool = true) {
        self.status = status
        self.explicitLabel = nil
        self.showIcon = showIcon
    }

    private let explicitLabel: String?

    private var label: String { explicitLabel ?? OfferStatus.label(status) }
    private var tint: Color { OfferStatus.tint(status) }

    var body: some View {
        HStack(spacing: 5) {
            if showIcon {
                Image(systemName: OfferStatus.icon(status))
                    .font(.system(size: 10, weight: .bold))
            }
            Text(label)
                .font(.system(size: 12, weight: .semibold))
        }
        .foregroundStyle(tint)
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(Capsule().fill(tint.opacity(0.14)))
    }
}

/// Score d'analyse (A/B/C/D), interne ou leaser.
struct ScoreChip: View {
    let letter: String
    let family: String

    private var tint: Color {
        switch letter.uppercased() {
        case "A": return Theme.emerald
        case "B": return Theme.amber
        case "C": return Theme.destructive
        default:  return Theme.mutedForeground
        }
    }

    var body: some View {
        Text("\(family) \(letter.uppercased())")
            .font(.system(size: 10, weight: .black))
            .foregroundStyle(tint)
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background(Capsule().fill(tint.opacity(0.15)))
    }
}
