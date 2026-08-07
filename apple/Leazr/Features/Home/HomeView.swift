import SwiftUI

/// Écran d'accueil — provisoire.
///
/// Il sert pour l'instant à valider la chaîne d'authentification de bout en
/// bout. Les modules métier (offres, contrats, catalogue, clients) viendront
/// s'y greffer écran par écran.
struct HomeView: View {

    @Environment(AuthStore.self) private var auth

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    connectedCard
                    nextStepsCard
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Leazr")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        if auth.biometry != .none {
                            Button {
                                Task { _ = await auth.enableBiometrics() }
                            } label: {
                                Label(
                                    auth.biometricsEnabled
                                        ? "\(auth.biometry.label) activé"
                                        : "Activer \(auth.biometry.label)",
                                    systemImage: auth.biometry.symbol
                                )
                            }
                            .disabled(auth.biometricsEnabled)
                        }

                        Divider()

                        Button(role: .destructive) {
                            Task { await auth.signOut() }
                        } label: {
                            Label("Se déconnecter", systemImage: "rectangle.portrait.and.arrow.right")
                        }
                    } label: {
                        Image(systemName: "person.crop.circle")
                            .font(.system(size: 20))
                    }
                }
            }
        }
    }

    private var connectedCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 12) {
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 26))
                    .foregroundStyle(Theme.primary)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Session active")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(Theme.foreground)

                    if case .signedIn(let email) = auth.state {
                        Text(email)
                            .font(.system(size: 14))
                            .foregroundStyle(Theme.mutedForeground)
                    }
                }

                Spacer()
            }

            if auth.biometricsEnabled {
                Label(
                    "Déverrouillage par \(auth.biometry.label) actif",
                    systemImage: auth.biometry.symbol
                )
                .font(.system(size: 14))
                .foregroundStyle(Theme.mutedForeground)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                .fill(Theme.surface)
        )
    }

    private var nextStepsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Prochaines étapes")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Theme.foreground)

            ForEach(
                [
                    "Tableau de bord et indicateurs",
                    "Offres : consultation et création",
                    "Contrats et signature",
                    "Catalogue et calculateur",
                    "Clients et CRM",
                ],
                id: \.self
            ) { item in
                HStack(spacing: 10) {
                    Circle()
                        .fill(Theme.border)
                        .frame(width: 6, height: 6)
                    Text(item)
                        .font(.system(size: 15))
                        .foregroundStyle(Theme.mutedForeground)
                    Spacer()
                }
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                .fill(Theme.surface)
        )
    }
}
