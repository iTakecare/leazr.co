import Foundation
import Observation
import SwiftUI
import Supabase

/// Chargeur générique pour les écrans de liste.
///
/// Tous les modules — contrats, clients, catalogue, facturation — partagent la
/// même mécanique : une requête filtrée par les politiques RLS côté serveur,
/// une recherche locale, un tirer-pour-rafraîchir. Factoriser ici évite de
/// répéter quatre fois la gestion d'état et d'erreur.
@MainActor
@Observable
final class ListStore<Item: Decodable & Identifiable & Sendable> {

    private(set) var items: [Item] = []
    private(set) var isLoading = false
    var errorMessage: String?
    var search = ""

    private let table: String
    private let columns: String
    private let orderBy: String
    private let matches: (Item, String) -> Bool

    init(
        table: String,
        columns: String,
        orderBy: String = "created_at",
        matches: @escaping (Item, String) -> Bool
    ) {
        self.table = table
        self.columns = columns
        self.orderBy = orderBy
        self.matches = matches
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }

        do {
            items = try await Backend.client
                .from(table)
                .select(columns)
                .order(orderBy, ascending: false)
                .limit(200)
                .execute()
                .value
            errorMessage = nil
        } catch {
            errorMessage = "Impossible de charger les données."
        }
    }

    var filtered: [Item] {
        guard !search.isEmpty else { return items }
        let q = search.lowercased()
        return items.filter { matches($0, q) }
    }
}

/// Habillage commun des écrans de liste : titre, recherche, état vide,
/// rafraîchissement et menu de compte.
struct ListScreen<Item: Decodable & Identifiable & Sendable, Row: View>: View {

    let title: String
    let searchPrompt: String
    let emptyIcon: String
    let emptyLabel: String
    /// Bouton « + » de la barre, quand l'écran sait créer un élément.
    var onCreate: (() -> Void)?
    /// Faux quand l'écran est poussé depuis une pile existante : imbriquer
    /// deux `NavigationStack` empile deux barres, donc deux flèches de retour.
    var wrapsNavigation = true
    @Bindable var store: ListStore<Item>
    @ViewBuilder let row: (Item) -> Row

    var body: some View {
        if wrapsNavigation {
            NavigationStack { content }
        } else {
            content
        }
    }

    private var content: some View {
        Group {
                if store.items.isEmpty && store.isLoading {
                    ProgressView().tint(Theme.mutedForeground)
                } else if store.filtered.isEmpty {
                    emptyState
                } else {
                    ScrollView {
                        LazyVStack(spacing: 10) {
                            if let error = store.errorMessage {
                                ErrorBanner(message: error)
                            }
                            ForEach(store.filtered) { row($0) }
                        }
                        .padding(20)
                        .frame(maxWidth: 700)
                        .frame(maxWidth: .infinity)
                    }
                }
            }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(wrapsNavigation ? .large : .inline)
        .toolbar {
            // Le menu de profil n'a de sens qu'à la racine d'un onglet : dans
            // une pile poussée, la place revient au bouton de retour.
            if wrapsNavigation { ProfileMenu() }
            if let onCreate {
                ToolbarItem(placement: wrapsNavigation ? .topBarLeading : .topBarTrailing) {
                    Button(action: onCreate) {
                        Image(systemName: "plus.circle.fill").font(.system(size: 20))
                    }
                }
            }
        }
        .searchable(text: $store.search, prompt: searchPrompt)
        .refreshable { await store.load() }
        .task { if store.items.isEmpty { await store.load() } }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: emptyIcon)
                .font(.system(size: 42, weight: .light))
                .foregroundStyle(Theme.mutedForeground)

            Text(store.search.isEmpty ? emptyLabel : "Aucun résultat")
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(Theme.foreground)
        }
    }
}

/// Carte de liste : fond, rayon et marges homogènes partout.
struct Card<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        content
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                    .fill(Theme.surface)
            )
    }
}

/// Ligne « libellé / valeur », utilisée dans les écrans de détail.
struct DetailRow: View {
    let label: String
    let value: String
    var emphasis: Bool = false

    var body: some View {
        HStack(alignment: .top) {
            Text(label)
                .font(.system(size: 15))
                .foregroundStyle(Theme.mutedForeground)
            Spacer(minLength: 12)
            Text(value)
                .font(.system(size: 15, weight: emphasis ? .bold : .semibold))
                .foregroundStyle(emphasis ? Theme.primary : Theme.foreground)
                .multilineTextAlignment(.trailing)
        }
        .padding(.vertical, 12)
    }
}
