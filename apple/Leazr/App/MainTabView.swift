import SwiftUI

/// Navigation principale.
///
/// `TabView` natif : chaque onglet garde sa propre pile de navigation, le geste
/// de retour et les transitions latérales sont fournis par le système. C'est ce
/// qu'aucune WebView ne sait reproduire fidèlement.
struct MainTabView: View {

    @State private var selection: Tab = .dashboard

    enum Tab: Hashable {
        case dashboard, offers
    }

    var body: some View {
        TabView(selection: $selection) {
            DashboardView()
                .tabItem { Label("Accueil", systemImage: "square.grid.2x2.fill") }
                .tag(Tab.dashboard)

            OffersView()
                .tabItem { Label("Offres", systemImage: "doc.text.fill") }
                .tag(Tab.offers)
        }
        .tint(Theme.primary)
        .onChange(of: selection) { _, _ in
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }
    }
}
