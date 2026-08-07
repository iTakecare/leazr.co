import SwiftUI

/// Écran de connexion.
struct LoginView: View {

    @Environment(AuthStore.self) private var auth

    @State private var email = ""
    @State private var password = ""
    @State private var showBiometricPrompt = false

    private var canSubmit: Bool {
        email.contains("@") && password.count >= 6
    }

    var body: some View {
        ZStack {
            BrandBackdrop()

            // GeometryReader + minHeight : sans ça, les Spacer d'une ScrollView
            // ne s'étirent pas et tout le contenu se tasse en haut de l'écran.
            GeometryReader { proxy in
              ScrollView {
                VStack(spacing: 0) {
                    Spacer(minLength: 24)

                    header

                    VStack(spacing: 14) {
                        LeazrField(
                            icon: "envelope.fill",
                            placeholder: "Adresse e-mail",
                            text: $email,
                            textContentType: .username,
                            keyboardType: .emailAddress
                        )

                        LeazrField(
                            icon: "lock.fill",
                            placeholder: "Mot de passe",
                            text: $password,
                            isSecure: true,
                            textContentType: .password
                        )

                        if let error = auth.errorMessage {
                            ErrorBanner(message: error)
                        }

                        PrimaryButton(
                            title: "Se connecter",
                            isLoading: auth.isWorking,
                            isEnabled: canSubmit
                        ) {
                            Task { await submit() }
                        }
                        .padding(.top, 6)
                    }
                    .padding(.top, 36)

                    Spacer(minLength: 32)

                    Text("Leazr — plateforme de gestion de leasing")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.mutedForeground)
                        .padding(.bottom, 20)
                }
                .padding(.horizontal, 24)
                .frame(maxWidth: 460)
                .frame(maxWidth: .infinity, minHeight: proxy.size.height)
              }
              .scrollDismissesKeyboard(.interactively)
              .scrollBounceBehavior(.basedOnSize)
            }
        }
        .animation(.easeOut(duration: 0.2), value: auth.errorMessage)
        .onAppear {
            if email.isEmpty, let last = auth.lastEmail { email = last }
        }
        .sheet(isPresented: $showBiometricPrompt) {
            BiometricOptInSheet()
                .presentationDetents([.height(420)])
                .presentationDragIndicator(.hidden)
                .interactiveDismissDisabled()
        }
    }

    // MARK: - Sous-vues

    private var header: some View {
        VStack(spacing: 18) {
            LogoMark(size: 76)

            VStack(spacing: 6) {
                Text("Bon retour")
                    .font(.system(size: 30, weight: .bold, design: .rounded))
                    .foregroundStyle(Theme.foreground)

                Text("Connectez-vous pour accéder à vos dossiers")
                    .font(.system(size: 15))
                    .foregroundStyle(Theme.mutedForeground)
                    .multilineTextAlignment(.center)
            }
        }
    }

    // MARK: - Actions

    private func submit() async {
        await auth.signIn(email: email, password: password)

        // Connexion réussie et biométrie disponible mais pas encore activée :
        // c'est le bon moment pour la proposer, une seule fois.
        if case .signedIn = auth.state,
           auth.biometry != .none,
           !auth.biometricsEnabled {
            showBiometricPrompt = true
        }
    }
}

/// Dégradé de marque très diffus : donne de la profondeur sans distraire.
struct BrandBackdrop: View {
    var body: some View {
        ZStack {
            Theme.background

            RadialGradient(
                colors: [Theme.primary.opacity(0.22), .clear],
                center: .topLeading,
                startRadius: 0,
                endRadius: 520
            )

            RadialGradient(
                colors: [Theme.primary.opacity(0.10), .clear],
                center: .bottomTrailing,
                startRadius: 0,
                endRadius: 420
            )
        }
        .ignoresSafeArea()
    }
}
