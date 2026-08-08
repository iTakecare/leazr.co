import SwiftUI

/// Navigation principale.
///
/// Exactement cinq onglets au maximum : au-delà, iOS crée un onglet « More »
/// qui enveloppe chaque écran dans SA propre barre de navigation, par-dessus la
/// nôtre — d'où les deux flèches de retour superposées. Les modules restants
/// vivent donc dans l'écran « Plus », que nous contrôlons.
struct MainTabView: View {

    @State private var selection: Tab = .dashboard

    enum Tab: Hashable {
        case dashboard, offers, clients, more
    }

    var body: some View {
        TabView(selection: $selection) {
            DashboardView()
                .tabItem { Label("Accueil", systemImage: "square.grid.2x2.fill") }
                .tag(Tab.dashboard)

            OffersView()
                .tabItem { Label("Demandes", systemImage: "doc.text.fill") }
                .tag(Tab.offers)

            ClientsView()
                .tabItem { Label("Clients", systemImage: "person.2.fill") }
                .tag(Tab.clients)

            MoreView()
                .tabItem { Label("Plus", systemImage: "ellipsis.circle.fill") }
                .tag(Tab.more)
        }
        .tint(Theme.primary)
        .onChange(of: selection) { _, _ in
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }
    }
}

/// Index des modules, dans l'ordre de la barre latérale du web.
struct MoreView: View {

    private struct Entry: Identifiable {
        let id: String
        let title: String
        let subtitle: String
        let icon: String
        let tint: Color
        let destination: AnyView
    }

    private var entries: [Entry] {
        [
            Entry(
                id: "crm",
                title: "CRM",
                subtitle: "Pipeline commercial et affaires",
                icon: "chart.line.uptrend.xyaxis",
                tint: Theme.primary,
                destination: AnyView(CRMView(embedded: true))
            ),
            Entry(
                id: "offers",
                title: "Demandes",
                subtitle: "Dossiers de financement en cours",
                icon: "doc.text.fill",
                tint: Theme.sky,
                destination: AnyView(OffersView(embedded: true))
            ),
            Entry(
                id: "contracts",
                title: "Contrats",
                subtitle: "Dossiers financés et actifs",
                icon: "signature",
                tint: Theme.violet,
                destination: AnyView(ContractsView(embedded: true))
            ),
            Entry(
                id: "invoices",
                title: "Factures",
                subtitle: "Factures émises et paiements",
                icon: "eurosign.circle.fill",
                tint: Theme.emerald,
                destination: AnyView(InvoicesView(embedded: true))
            ),
            Entry(
                id: "catalog",
                title: "Catalogue",
                subtitle: "Produits et prix d'achat",
                icon: "shippingbox.fill",
                tint: Theme.teal,
                destination: AnyView(CatalogView(embedded: true))
            ),
            Entry(
                id: "stock",
                title: "Stock",
                subtitle: "Matériel disponible, réservé et attribué",
                icon: "cube.box.fill",
                tint: Theme.amber,
                destination: AnyView(StockView(embedded: true))
            ),
            Entry(
                id: "settings",
                title: "Paramètres",
                subtitle: "Compte, sécurité et appels",
                icon: "gearshape.fill",
                tint: Theme.mutedForeground,
                destination: AnyView(SettingsView(embedded: true))
            ),
        ]
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 10) {
                    ForEach(entries) { entry in
                        NavigationLink {
                            entry.destination
                        } label: {
                            Card {
                                HStack(spacing: 14) {
                                    Image(systemName: entry.icon)
                                        .font(.system(size: 17, weight: .semibold))
                                        .foregroundStyle(.white)
                                        .frame(width: 42, height: 42)
                                        .background(
                                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                                .fill(entry.tint)
                                        )

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(entry.title)
                                            .font(.system(size: 16, weight: .semibold))
                                            .foregroundStyle(Theme.foreground)
                                        Text(entry.subtitle)
                                            .font(.system(size: 13))
                                            .foregroundStyle(Theme.mutedForeground)
                                    }

                                    Spacer(minLength: 0)

                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundStyle(Theme.mutedForeground)
                                }
                            }
                        }
                        .buttonStyle(PressableStyle())
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Plus")
            .toolbar { ProfileMenu() }
        }
    }
}
