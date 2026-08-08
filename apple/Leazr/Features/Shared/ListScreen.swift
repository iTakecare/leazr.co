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
    private(set) var isSearchingRemotely = false
    var errorMessage: String?

    /// Résultats venus du serveur pour le terme courant. Sans eux, un client au
    ///-delà des premières lignes chargées restait introuvable : la recherche
    /// locale ne peut filtrer que ce qui a déjà été téléchargé.
    private(set) var remoteResults: [Item] = []

    var search = "" {
        didSet { if search != oldValue { scheduleRemoteSearch() } }
    }

    private let table: String
    private let columns: String
    private let orderBy: String
    private let pageSize: Int
    /// Colonnes interrogées en `ilike` côté serveur. Vide = recherche locale
    /// seulement.
    private let searchColumns: [String]
    private let matches: (Item, String) -> Bool

    private var searchTask: Task<Void, Never>?

    init(
        table: String,
        columns: String,
        orderBy: String = "created_at",
        pageSize: Int = 200,
        searchColumns: [String] = [],
        matches: @escaping (Item, String) -> Bool
    ) {
        self.table = table
        self.columns = columns
        self.orderBy = orderBy
        self.pageSize = pageSize
        self.searchColumns = searchColumns
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
                .limit(pageSize)
                .execute()
                .value
            errorMessage = nil
        } catch {
            errorMessage = "Impossible de charger les données."
        }
    }

    /// Interroge le serveur après une courte pause, pour ne pas lancer une
    /// requête à chaque frappe.
    private func scheduleRemoteSearch() {
        searchTask?.cancel()

        let term = search.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !searchColumns.isEmpty, term.count >= 2 else {
            remoteResults = []
            isSearchingRemotely = false
            return
        }

        searchTask = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(250))
            guard !Task.isCancelled else { return }
            await self?.runRemoteSearch(term)
        }
    }

    private func runRemoteSearch(_ term: String) async {
        isSearchingRemotely = true
        defer { isSearchingRemotely = false }

        // La virgule et les parenthèses séparent les clauses dans la syntaxe
        // `or` de PostgREST : les laisser passer casserait la requête.
        let safe = term
            .replacingOccurrences(of: ",", with: " ")
            .replacingOccurrences(of: "(", with: " ")
            .replacingOccurrences(of: ")", with: " ")
            .trimmingCharacters(in: .whitespaces)
        guard !safe.isEmpty else { return }

        let clause = searchColumns.map { "\($0).ilike.%\(safe)%" }.joined(separator: ",")

        let found: [Item] = (try? await Backend.client
            .from(table)
            .select(columns)
            .or(clause)
            .limit(50)
            .execute().value) ?? []

        guard !Task.isCancelled, search.trimmingCharacters(in: .whitespacesAndNewlines) == term else {
            return
        }
        remoteResults = found
    }

    var filtered: [Item] {
        guard !search.isEmpty else { return items }
        let q = search.lowercased()
        let local = items.filter { matches($0, q) }

        guard !remoteResults.isEmpty else { return local }

        // Les résultats déjà chargés viennent d'abord, puis ceux que seule la
        // requête serveur a ramenés — sans doublon.
        var seen = Set(local.map(\.id))
        var result = local
        for item in remoteResults where !seen.contains(item.id) {
            seen.insert(item.id)
            result.append(item)
        }
        return result
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
