import SwiftUI

/// Aiguille vers l'écran correspondant à l'état d'authentification.
struct RootView: View {

    @Environment(AuthStore.self) private var auth

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            switch auth.state {
            case .launching:
                LaunchView()

            case .signedOut:
                LoginView()
                    .transition(.opacity.combined(with: .move(edge: .bottom)))

            case .locked(let email):
                LockScreen(email: email)
                    .transition(.opacity)

            case .signedIn:
                MainTabView()
                    .transition(.opacity)
            }
        }
        .animation(.smooth(duration: 0.35), value: auth.state)
    }
}

/// Écran transitoire pendant la vérification de session : volontairement sobre
/// pour se fondre avec l'écran de lancement du système.
private struct LaunchView: View {
    var body: some View {
        VStack {
            LogoMark(size: 72)
            ProgressView()
                .tint(Theme.mutedForeground)
                .padding(.top, 28)
        }
    }
}
