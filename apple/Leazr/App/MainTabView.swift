import SwiftUI

/// Navigation principale.
///
/// Exactement cinq onglets, jamais plus : au-delà, iOS crée un onglet « More »
/// qui enveloppe chaque écran dans SA propre barre de navigation, par-dessus la
/// nôtre — d'où les deux flèches de retour superposées. Les modules restants
/// vivent donc dans un écran « Plus » que nous contrôlons.
struct MainTabView: View {

    @State private var selection: Tab = .dashboard

    enum Tab: Hashable {
        case dashboard, offers, crm, clients, more
    }

    var body: some View {
        TabView(selection: $selection) {
            DashboardView()
                .tabItem { Label("Accueil", systemImage: "square.grid.2x2.fill") }
                .tag(Tab.dashboard)

            OffersView()
                .tabItem { Label("Offres", systemImage: "doc.text.fill") }
                .tag(Tab.offers)

            CRMView()
                .tabItem { Label("Affaires", systemImage: "chart.line.uptrend.xyaxis") }
                .tag(Tab.crm)

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

/// Les modules qui ne tiennent pas dans la barre d'onglets, dans notre propre
/// pile de navigation.
struct MoreView: View {

    private struct Entry: Identifiable {
        let id = UUID()
        let title: String
        let subtitle: String
        let icon: String
        let tint: Color
        let destination: AnyView
    }

    private var entries: [Entry] {
        [
            Entry(
                title: "Contrats",
                subtitle: "Dossiers financés et en cours",
                icon: "signature",
                tint: Theme.violet,
                destination: AnyView(ContractsView(embedded: true))
            ),
            Entry(
                title: "Catalogue",
                subtitle: "Produits et prix d'achat",
                icon: "shippingbox.fill",
                tint: Theme.sky,
                destination: AnyView(CatalogView(embedded: true))
            ),
            Entry(
                title: "Facturation",
                subtitle: "Factures émises et paiements",
                icon: "eurosign.circle.fill",
                tint: Theme.emerald,
                destination: AnyView(InvoicesView(embedded: true))
            ),
            Entry(
                title: "Support",
                subtitle: "Tickets et demandes d'aide",
                icon: "lifepreserver.fill",
                tint: Theme.amber,
                destination: AnyView(SupportView(embedded: true))
            ),
            Entry(
                title: "Réglages",
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
