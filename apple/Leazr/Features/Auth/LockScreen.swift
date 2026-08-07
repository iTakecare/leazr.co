import SwiftUI

/// Écran de déverrouillage : la session est valide, il ne manque que Face ID.
struct LockScreen: View {

    @Environment(AuthStore.self) private var auth
    let email: String

    /// Déclenche la demande biométrique dès l'apparition, comme le font les
    /// apps bancaires : l'utilisateur n'a rien à toucher dans le cas nominal.
    @State private var hasTriedOnce = false

    var body: some View {
        ZStack {
            BrandBackdrop()

            VStack(spacing: 0) {
                Spacer()

                LogoMark(size: 84)

                VStack(spacing: 8) {
                    Text("Leazr est verrouillé")
                        .font(.system(size: 26, weight: .bold, design: .rounded))
                        .foregroundStyle(Theme.foreground)

                    Text(email)
                        .font(.system(size: 15))
                        .foregroundStyle(Theme.mutedForeground)
                }
                .padding(.top, 24)

                if let error = auth.errorMessage {
                    ErrorBanner(message: error)
                        .padding(.top, 24)
                        .padding(.horizontal, 24)
                }

                Button {
                    Task { await auth.unlockWithBiometrics() }
                } label: {
                    VStack(spacing: 12) {
                        Image(systemName: auth.biometry.symbol)
                            .font(.system(size: 46, weight: .light))
                            .foregroundStyle(Theme.primary)

                        Text("Déverrouiller avec \(auth.biometry.label)")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(Theme.primary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 28)
                    .background(
                        RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                            .fill(Theme.surface)
                            .shadow(color: .black.opacity(0.06), radius: 18, y: 8)
                    )
                }
                .buttonStyle(PressableStyle())
                .padding(.top, 40)
                .padding(.horizontal, 24)

                Spacer()

                TertiaryButton(title: "Utiliser mon mot de passe") {
                    auth.requestPasswordSignIn()
                }
                .padding(.bottom, 12)

                Button {
                    Task { await auth.signOut() }
                } label: {
                    Text("Changer de compte")
                        .font(.system(size: 14))
                        .foregroundStyle(Theme.mutedForeground)
                }
                .buttonStyle(PressableStyle())
                .padding(.bottom, 24)
            }
            .frame(maxWidth: 460)
        }
        .task {
            guard !hasTriedOnce else { return }
            hasTriedOnce = true
            await auth.unlockWithBiometrics()
        }
    }
}

/// Proposition d'activer la biométrie, affichée une seule fois après la
/// première connexion réussie.
struct BiometricOptInSheet: View {

    @Environment(AuthStore.self) private var auth
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 28)

            Image(systemName: auth.biometry.symbol)
                .font(.system(size: 60, weight: .light))
                .foregroundStyle(Theme.primary)

            Text("Activer \(auth.biometry.label) ?")
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundStyle(Theme.foreground)
                .padding(.top, 22)

            Text("Ouvrez Leazr d'un regard, sans ressaisir votre mot de passe. Vos dossiers restent protégés quand le téléphone change de mains.")
                .font(.system(size: 15))
                .foregroundStyle(Theme.mutedForeground)
                .multilineTextAlignment(.center)
                .padding(.top, 10)
                .padding(.horizontal, 28)

            Spacer(minLength: 24)

            VStack(spacing: 10) {
                PrimaryButton(title: "Activer", systemImage: auth.biometry.symbol) {
                    Task {
                        _ = await auth.enableBiometrics()
                        dismiss()
                    }
                }

                TertiaryButton(title: "Plus tard") { dismiss() }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 28)
        }
        .background(Theme.surface)
    }
}
