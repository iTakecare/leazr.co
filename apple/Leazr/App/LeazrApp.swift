import SwiftUI

@main
struct LeazrApp: App {

    @State private var auth = AuthStore()

    /// Verrouille l'app dès qu'elle passe en arrière-plan : au retour, Face ID
    /// est redemandé. Sans ça, un téléphone posé sur un bureau expose tout le
    /// portefeuille client à qui l'ouvre.
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(auth)
                .task { await auth.bootstrap() }
                .onChange(of: scenePhase) { _, phase in
                    if phase == .background { auth.lockIfNeeded() }
                }
        }
    }
}
