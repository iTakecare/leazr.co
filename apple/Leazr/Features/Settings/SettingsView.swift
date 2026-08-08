import Foundation
import Observation
import SwiftUI
import Supabase

@MainActor
@Observable
final class SettingsStore {

    private(set) var profile: SettingsService.Profile?
    private(set) var team: [SettingsService.Profile] = []
    private(set) var leasers: [SettingsService.Leaser] = []
    private(set) var levels: [SettingsService.CommissionLevel] = []
    private(set) var rates: [SettingsService.CommissionRate] = []
    private(set) var customization: SettingsService.Customization?
    private(set) var integrations: [SettingsService.Integration] = []
    private(set) var blocks: [SettingsService.ContentBlock] = []
    private(set) var templates: [SettingsService.EmailTemplate] = []
    private(set) var subscription: SettingsService.Subscription?
    private(set) var company: SettingsService.CompanyInfo?
    private(set) var companyId: String?
    private(set) var isLoading = false
    var errorMessage: String?

    func load() async {
        isLoading = true
        defer { isLoading = false }

        profile = await SettingsService.currentProfile()

        guard let companyId = await Session.shared.resolve() else {
            errorMessage = "Société introuvable."
            return
        }
        self.companyId = companyId

        async let teamTask = SettingsService.teamMembers(companyId: companyId)
        async let leasersTask = SettingsService.leasers(companyId: companyId)
        async let levelsTask = SettingsService.commissionLevels(companyId: companyId)
        async let ratesTask = SettingsService.commissionRates(companyId: companyId)
        async let customTask = SettingsService.customization(companyId: companyId)
        async let integrationsTask = SettingsService.integrations(companyId: companyId)
        async let blocksTask = SettingsService.contentBlocks(companyId: companyId)
        async let templatesTask = SettingsService.emailTemplates(companyId: companyId)
        async let subscriptionTask = SettingsService.subscription(companyId: companyId)
        async let companyTask = SettingsService.companyInfo(companyId: companyId)

        team = await teamTask
        leasers = await leasersTask
        levels = await levelsTask
        rates = await ratesTask
        customization = await customTask
        integrations = await integrationsTask
        blocks = await blocksTask
        templates = await templatesTask
        subscription = await subscriptionTask
        company = await companyTask
        errorMessage = nil
    }

    func rates(for level: SettingsService.CommissionLevel) -> [SettingsService.CommissionRate] {
        rates.filter { $0.levelId == level.id }
    }
}

// MARK: - Écran

struct SettingsView: View {

    /// Poussé depuis « Plus » : la pile de navigation existe déjà.
    var embedded = false

    @Environment(AuthStore.self) private var auth
    @State private var store = SettingsStore()
    @State private var preferredDialer: String? = Dialer.preferred?.id
    @State private var isEditingProfile = false
    @State private var isResettingPassword = false
    @State private var message: String?

    var body: some View {
        if embedded { content } else { NavigationStack { content } }
    }

    private var content: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let error = store.errorMessage {
                    ErrorBanner(message: error)
                }
                if let message {
                    InfoBanner(message: message)
                }

                accountCard

                SettingsSection(title: "Mon compte") {
                    SettingsRow(
                        icon: "person.text.rectangle",
                        tint: Theme.primary,
                        title: "Modifier mon profil",
                        value: store.profile?.fullName
                    ) { isEditingProfile = true }

                    SettingsRow(
                        icon: "key.fill",
                        tint: Theme.amber,
                        title: "Changer mon mot de passe",
                        value: "Par courriel"
                    ) { isResettingPassword = true }

                    if auth.biometry != .none {
                        SettingsRow(
                            icon: auth.biometry.symbol,
                            tint: Theme.violet,
                            title: "Déverrouillage \(auth.biometry.label)",
                            value: auth.biometricsEnabled ? "Activé" : "Désactivé"
                        ) {
                            if !auth.biometricsEnabled {
                                Task { _ = await auth.enableBiometrics() }
                            }
                        }
                    }
                }

                SettingsSection(title: "Appels") {
                    Menu {
                        ForEach(Dialer.available) { app in
                            Button(app.name) { preferredDialer = app.id; Dialer.preferred = app }
                        }
                        if preferredDialer != nil {
                            Divider()
                            Button("Demander à chaque appel", role: .destructive) {
                                preferredDialer = nil
                                Dialer.preferred = nil
                            }
                        }
                    } label: {
                        SettingsRowContent(
                            icon: "phone.arrow.up.right.fill",
                            tint: Theme.emerald,
                            title: "Application d'appel",
                            value: Dialer.available.first { $0.id == preferredDialer }?.name ?? "Demander"
                        )
                    }
                }

                SettingsSection(title: "Société") {
                    navigationRow(
                        icon: "person.2.fill",
                        tint: Theme.sky,
                        title: "Utilisateurs",
                        value: "\(store.team.count)"
                    ) { TeamScreen(store: store) }

                    navigationRow(
                        icon: "building.columns.fill",
                        tint: Theme.violet,
                        title: "Bailleurs",
                        value: "\(store.leasers.count)"
                    ) { LeasersScreen(store: store) }

                    navigationRow(
                        icon: "percent",
                        tint: Theme.teal,
                        title: "Commissions",
                        value: "\(store.levels.count)"
                    ) { CommissionsScreen(store: store) }

                    navigationRow(
                        icon: "paintbrush.fill",
                        tint: Theme.rose,
                        title: "Image de marque",
                        value: store.customization?.companyName
                    ) { BrandingScreen(store: store) }
                }

                SettingsSection(title: "Contenus et envois") {
                    navigationRow(
                        icon: "doc.richtext.fill",
                        tint: Theme.primary,
                        title: "Textes des offres",
                        value: "\(store.blocks.count)"
                    ) { ContentBlocksScreen(store: store) }

                    navigationRow(
                        icon: "envelope.fill",
                        tint: Theme.amber,
                        title: "Modèles d'e-mails",
                        value: "\(store.templates.count)"
                    ) { EmailTemplatesScreen(store: store) }
                }

                SettingsSection(title: "Connexions") {
                    navigationRow(
                        icon: "puzzlepiece.extension.fill",
                        tint: Theme.emerald,
                        title: "Intégrations",
                        value: "\(store.integrations.filter(\.isEnabled).count) active(s)"
                    ) { IntegrationsScreen(store: store) }

                    navigationRow(
                        icon: "globe",
                        tint: Theme.sky,
                        title: "Intégration web",
                        value: store.customization?.customDomain
                    ) { WebIntegrationScreen(store: store) }

                    navigationRow(
                        icon: "creditcard.fill",
                        tint: Theme.violet,
                        title: "Abonnement",
                        value: store.subscription?.plan ?? store.company?.plan
                    ) { SubscriptionScreen(store: store) }
                }

                SettingsSection(title: "Application") {
                    SettingsRow(
                        icon: "number",
                        tint: Theme.mutedForeground,
                        title: "Version",
                        value: Self.version
                    )
                }

                Button {
                    Task { await auth.signOut() }
                } label: {
                    Text("Se déconnecter")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.destructive)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(
                            RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                .fill(Theme.destructive.opacity(0.12))
                        )
                }
                .buttonStyle(PressableStyle())
                .padding(.top, 8)
            }
            .padding(20)
            .frame(maxWidth: 700)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("Paramètres")
        .navigationBarTitleDisplayMode(embedded ? .inline : .large)
        .sheet(isPresented: $isEditingProfile) {
            ProfileFormSheet(profile: store.profile) { await store.load() }
                .presentationDetents([.medium, .large])
        }
        .alert("Changer le mot de passe", isPresented: $isResettingPassword) {
            Button("Annuler", role: .cancel) {}
            Button("Envoyer le lien") {
                Task {
                    guard let email = store.profile?.email else { return }
                    if await SettingsService.requestPasswordReset(email: email) {
                        message = "Lien de réinitialisation envoyé à \(email)."
                    }
                }
            }
        } message: {
            Text("Un lien de réinitialisation sera envoyé à \(store.profile?.email ?? "votre adresse"). Aucun mot de passe ne transite par l'application.")
        }
        .refreshable { await store.load() }
        .task { if store.profile == nil { await store.load() } }
    }

    /// Ligne de réglage qui ouvre un écran. `SettingsRow` est un bouton, donc
    /// inutilisable comme étiquette de `NavigationLink`.
    private func navigationRow<Destination: View>(
        icon: String,
        tint: Color,
        title: String,
        value: String?,
        @ViewBuilder destination: () -> Destination
    ) -> some View {
        NavigationLink(destination: destination()) {
            SettingsRowContent(icon: icon, tint: tint, title: title, value: value)
        }
        .buttonStyle(PressableStyle())
    }

    private var accountCard: some View {
        VStack(spacing: 10) {
            if let url = store.profile?.avatarURL.flatMap(URL.init) {
                AsyncImage(url: url) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Image(systemName: "person.crop.circle.fill")
                        .font(.system(size: 54))
                        .foregroundStyle(.white)
                }
                .frame(width: 68, height: 68)
                .clipShape(Circle())
            } else {
                Text(store.profile?.initials ?? "—")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 68, height: 68)
                    .background(Circle().fill(Color.white.opacity(0.22)))
            }

            Text(store.profile?.fullName ?? "")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(.white)

            if case .signedIn(let email) = auth.state {
                Text(email)
                    .font(.system(size: 13))
                    .foregroundStyle(.white.opacity(0.85))
            }

            if let role = store.profile?.role {
                Text(SettingsService.roleLabel(role))
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Capsule().fill(Color.white.opacity(0.22)))
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 26)
        .background(
            RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                .fill(Theme.gradient(Theme.primary))
        )
    }

    private static var version: String {
        let v = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "—"
        let b = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "—"
        return "\(v) (\(b))"
    }
}

// MARK: - Profil

struct ProfileFormSheet: View {

    @Environment(\.dismiss) private var dismiss

    let profile: SettingsService.Profile?
    let onSaved: () async -> Void

    @State private var firstName = ""
    @State private var lastName = ""
    @State private var phone = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage { ErrorBanner(message: errorMessage) }

                    FormSection(title: "Identité") {
                        VStack(spacing: 10) {
                            LeazrField(
                                icon: "person",
                                placeholder: "Prénom",
                                text: $firstName,
                                textContentType: .givenName,
                                autocapitalization: .words
                            )
                            LeazrField(
                                icon: "person.fill",
                                placeholder: "Nom",
                                text: $lastName,
                                textContentType: .familyName,
                                autocapitalization: .words
                            )
                        }
                    }

                    FormSection(title: "Téléphone") {
                        LeazrField(
                            icon: "phone",
                            placeholder: "+32 …",
                            text: $phone,
                            textContentType: .telephoneNumber,
                            keyboardType: .phonePad
                        )
                    }

                    // L'adresse identifie le compte : la changer relève de
                    // l'authentification, pas d'un formulaire de profil.
                    if let email = profile?.email {
                        Card {
                            VStack(spacing: 0) {
                                DetailRow(label: "Adresse du compte", value: email)
                            }
                        }
                        Text("L'adresse de connexion se change depuis le web.")
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.mutedForeground)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    PrimaryButton(
                        title: "Enregistrer",
                        systemImage: "checkmark.circle.fill",
                        isLoading: isSaving
                    ) {
                        Task { await save() }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Mon profil")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .onAppear {
                firstName = profile?.firstName ?? ""
                lastName = profile?.lastName ?? ""
                phone = profile?.phone ?? ""
            }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        if await SettingsService.updateProfile(
            firstName: firstName,
            lastName: lastName,
            phone: phone
        ) {
            await onSaved()
            dismiss()
        } else {
            errorMessage = "Enregistrement impossible."
        }
    }
}
