import SwiftUI

/// Navigation principale.
///
/// `TabView` natif : chaque onglet garde sa propre pile de navigation, le geste
/// de retour et les transitions latérales sont fournis par le système. Au-delà
/// de cinq onglets, iOS regroupe automatiquement le reste sous « Plus ».
struct MainTabView: View {

    @State private var selection: Tab = .dashboard

    enum Tab: Hashable {
        case dashboard, offers, crm, contracts, clients, catalog, invoices, support, settings
    }

    var body: some View {
        TabView(selection: $selection) {
            DashboardView()
                .tabItem { Label("Accueil", systemImage: "square.grid.2x2.fill") }
                .tag(Tab.dashboard)

            OffersView()
                .tabItem { Label("Offres", systemImage: "doc.text.fill") }
                .tag(Tab.offers)

            // Le CRM précède les contrats : c'est là que se passe la journée
            // d'un commercial, avant qu'un dossier n'existe.
            CRMView()
                .tabItem { Label("Affaires", systemImage: "chart.line.uptrend.xyaxis") }
                .tag(Tab.crm)

            ContractsView()
                .tabItem { Label("Contrats", systemImage: "signature") }
                .tag(Tab.contracts)

            ClientsView()
                .tabItem { Label("Clients", systemImage: "person.2.fill") }
                .tag(Tab.clients)

            CatalogView()
                .tabItem { Label("Catalogue", systemImage: "shippingbox.fill") }
                .tag(Tab.catalog)

            InvoicesView()
                .tabItem { Label("Facturation", systemImage: "eurosign.circle.fill") }
                .tag(Tab.invoices)

            SupportView()
                .tabItem { Label("Support", systemImage: "lifepreserver.fill") }
                .tag(Tab.support)

            SettingsView()
                .tabItem { Label("Réglages", systemImage: "gearshape.fill") }
                .tag(Tab.settings)
        }
        .tint(Theme.primary)
        .onChange(of: selection) { _, _ in
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }
    }
}
