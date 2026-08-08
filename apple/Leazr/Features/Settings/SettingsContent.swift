import Foundation
import SwiftUI
import Supabase

// MARK: - Textes des offres

/// Blocs de texte qui composent le PDF d'offre. Ils sont éditables : ce sont
/// des paragraphes, pas une mise en page.
struct ContentBlocksScreen: View {

    @Bindable var store: SettingsStore
    @State private var editing: SettingsService.ContentBlock?

    private var byPage: [(page: String, blocks: [SettingsService.ContentBlock])] {
        Dictionary(grouping: store.blocks, by: \.pageName)
            .map { (page: $0.key, blocks: $0.value.sorted { $0.blockKey < $1.blockKey }) }
            .sorted { $0.page < $1.page }
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                if store.blocks.isEmpty {
                    EmptyHint(icon: "doc.richtext", label: "Aucun texte configuré")
                }

                ForEach(byPage, id: \.page) { group in
                    SectionHeader(title: group.blocks.first?.pageLabel ?? group.page)

                    ForEach(group.blocks) { block in
                        Button {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            editing = block
                        } label: {
                            Card {
                                VStack(alignment: .leading, spacing: 6) {
                                    HStack {
                                        Text(block.label)
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(Theme.foreground)
                                        Spacer()
                                        Image(systemName: "square.and.pencil")
                                            .font(.system(size: 13))
                                            .foregroundStyle(Theme.primary)
                                    }

                                    Text(preview(block.content))
                                        .font(.system(size: 13))
                                        .foregroundStyle(Theme.mutedForeground)
                                        .multilineTextAlignment(.leading)
                                        .lineLimit(3)
                                }
                            }
                        }
                        .buttonStyle(PressableStyle())
                    }
                }
            }
            .padding(20)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("Textes des offres")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $editing) { block in
            ContentBlockSheet(block: block) { await store.load() }
        }
    }

    /// Aperçu débarrassé de ses balises : le contenu peut être du HTML.
    private func preview(_ content: String) -> String {
        content
            .replacingOccurrences(of: "<[^>]+>", with: " ", options: .regularExpression)
            .replacingOccurrences(of: "&nbsp;", with: " ")
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .ifBlank("Vide")
    }
}

struct ContentBlockSheet: View {

    @Environment(\.dismiss) private var dismiss

    let block: SettingsService.ContentBlock
    let onSaved: () async -> Void

    @State private var content = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    private var containsHTML: Bool {
        content.range(of: "<[a-zA-Z/][^>]*>", options: .regularExpression) != nil
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage { ErrorBanner(message: errorMessage) }

                    if containsHTML {
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "chevron.left.forwardslash.chevron.right")
                                .font(.system(size: 13))
                            Text("Ce texte contient des balises HTML. Modifiez le contenu sans y toucher : elles gouvernent la mise en forme du PDF.")
                                .font(.system(size: 12))
                        }
                        .foregroundStyle(Theme.amber)
                        .padding(11)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(Theme.amber.opacity(0.13))
                        )
                    }

                    FormSection(title: block.label) {
                        TextEditor(text: $content)
                            .font(.system(size: 14, design: containsHTML ? .monospaced : .default))
                            .scrollContentBackground(.hidden)
                            .padding(12)
                            .frame(minHeight: 260)
                            .background(
                                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                    .fill(Theme.surface)
                            )
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
            .navigationTitle(block.pageLabel)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .onAppear { content = block.content }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        if await SettingsService.updateContentBlock(id: block.id, content: content) {
            await onSaved()
            dismiss()
        } else {
            errorMessage = "Enregistrement impossible."
        }
    }
}

// MARK: - Modèles d'e-mails

/// Gabarits d'envoi. On expose l'objet et l'activation ; le corps est du HTML
/// composé dans un éditeur riche, il reste au web.
struct EmailTemplatesScreen: View {

    @Bindable var store: SettingsStore
    @State private var editing: SettingsService.EmailTemplate?

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                if store.templates.isEmpty {
                    EmptyHint(icon: "envelope", label: "Aucun modèle")
                }

                ForEach(store.templates) { template in
                    Button {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        editing = template
                    } label: {
                        Card {
                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    Text(template.name)
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundStyle(Theme.foreground)
                                    Spacer()
                                    Tag(
                                        label: template.isActive ? "Actif" : "Inactif",
                                        tint: template.isActive ? Theme.emerald : Theme.mutedForeground
                                    )
                                }

                                Text(template.subject.ifBlank("Sans objet"))
                                    .font(.system(size: 13))
                                    .foregroundStyle(Theme.mutedForeground)
                                    .multilineTextAlignment(.leading)
                                    .lineLimit(2)
                            }
                        }
                    }
                    .buttonStyle(PressableStyle())
                }

                Text("Le corps des e-mails se compose depuis le web : il est en HTML et porte des variables.")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.mutedForeground)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, 8)
            }
            .padding(20)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("Modèles d'e-mails")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $editing) { template in
            EmailTemplateSheet(template: template) { await store.load() }
                .presentationDetents([.height(420)])
        }
    }
}

struct EmailTemplateSheet: View {

    @Environment(\.dismiss) private var dismiss

    let template: SettingsService.EmailTemplate
    let onSaved: () async -> Void

    @State private var subject = ""
    @State private var isActive = true
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage { ErrorBanner(message: errorMessage) }

                    FormSection(title: "Objet") {
                        LeazrTextArea(placeholder: "Objet de l'e-mail", text: $subject)
                    }

                    Toggle("Modèle actif", isOn: $isActive)
                        .tint(Theme.primary)
                        .font(.system(size: 15))
                        .padding(.horizontal, 16)
                        .frame(height: 52)
                        .background(
                            RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                .fill(Theme.surface)
                        )

                    Text("Un modèle inactif laisse place au gabarit intégré du serveur.")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    PrimaryButton(
                        title: "Enregistrer",
                        systemImage: "checkmark.circle.fill",
                        isLoading: isSaving
                    ) {
                        Task { await save() }
                    }
                }
                .padding(20)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle(template.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .onAppear {
                subject = template.subject
                isActive = template.isActive
            }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        if await SettingsService.setEmailTemplate(
            id: template.id,
            subject: subject,
            active: isActive
        ) {
            await onSaved()
            dismiss()
        } else {
            errorMessage = "Enregistrement impossible."
        }
    }
}

// MARK: - Intégrations

/// État des connexions à des services tiers. On peut les activer ou les
/// suspendre, jamais voir leurs identifiants : un secret n'a rien à faire sur
/// un écran de téléphone.
struct IntegrationsScreen: View {

    @Bindable var store: SettingsStore
    @State private var working: String?

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                if store.integrations.isEmpty {
                    EmptyHint(icon: "puzzlepiece.extension", label: "Aucune intégration configurée")
                }

                ForEach(store.integrations) { integration in
                    Card {
                        HStack(spacing: 12) {
                            Image(systemName: integration.icon)
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(.white)
                                .frame(width: 38, height: 38)
                                .background(
                                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                                        .fill(integration.isEnabled ? Theme.emerald : Theme.mutedForeground)
                                )

                            VStack(alignment: .leading, spacing: 2) {
                                Text(integration.label)
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(Theme.foreground)
                                if let updated = integration.updatedAt {
                                    Text("Modifiée le \(Format.date(updated))")
                                        .font(.system(size: 12))
                                        .foregroundStyle(Theme.mutedForeground)
                                }
                            }

                            Spacer(minLength: 4)

                            if working == integration.id {
                                ProgressView().controlSize(.small)
                            } else {
                                Toggle("", isOn: Binding(
                                    get: { integration.isEnabled },
                                    set: { value in
                                        Task {
                                            working = integration.id
                                            _ = await SettingsService.setIntegration(
                                                id: integration.id,
                                                enabled: value
                                            )
                                            await store.load()
                                            working = nil
                                        }
                                    }
                                ))
                                .labelsHidden()
                                .tint(Theme.emerald)
                            }
                        }
                    }
                }

                Text("Les identifiants et les correspondances de champs se règlent depuis le web. Ils ne sont jamais affichés ici.")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.mutedForeground)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, 8)
            }
            .padding(20)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("Intégrations")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Intégration web

struct WebIntegrationScreen: View {

    @Bindable var store: SettingsStore

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Card {
                    VStack(spacing: 0) {
                        DetailRow(
                            label: "Domaine personnalisé",
                            value: store.customization?.customDomain ?? "Aucun"
                        )
                        Divider().overlay(Theme.border)
                        DetailRow(
                            label: "Formulaire de demande",
                            value: store.customization?.quoteRequestURL ?? "Non configuré"
                        )
                        if let day = store.customization?.paymentDay {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Jour de prélèvement", value: "le \(day)")
                        }
                        if let prefix = store.company?.contractPrefix {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Préfixe des contrats", value: prefix)
                        }
                    }
                }

                if let url = store.customization?.quoteRequestURL.flatMap(URL.init) {
                    Link(destination: url) {
                        ActionRowLabel(
                            icon: "safari.fill",
                            tint: Theme.sky,
                            title: "Ouvrir le formulaire public",
                            subtitle: url.absoluteString
                        )
                    }
                }

                if let modules = store.company?.modulesEnabled, !modules.isEmpty {
                    SectionHeader(title: "Modules activés", count: modules.count)
                    Card {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 110), spacing: 8)], spacing: 8) {
                            ForEach(modules, id: \.self) { module in
                                Text(module.replacingOccurrences(of: "_", with: " ").capitalized)
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(Theme.primary)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 6)
                                    .frame(maxWidth: .infinity)
                                    .background(Capsule().fill(Theme.primary.opacity(0.13)))
                            }
                        }
                    }
                }

                Text("Le catalogue public, les couleurs et les gabarits d'intégration se règlent depuis le web.")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.mutedForeground)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(20)
            .frame(maxWidth: 700)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("Intégration web")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Abonnement

struct SubscriptionScreen: View {

    @Bindable var store: SettingsStore

    private var isActive: Bool {
        store.subscription?.isActive ?? false
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                HighlightCard(
                    label: isActive ? "Abonnement actif" : "Abonnement",
                    value: (store.subscription?.plan ?? store.company?.plan ?? "—").capitalized,
                    tint: isActive ? Theme.emerald : Theme.mutedForeground
                )

                Card {
                    VStack(spacing: 0) {
                        DetailRow(label: "Société", value: store.company?.name ?? "—")
                        Divider().overlay(Theme.border)
                        DetailRow(
                            label: "Formule",
                            value: (store.subscription?.plan ?? store.company?.plan ?? "—").capitalized
                        )
                        if let start = store.subscription?.periodStart {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Période depuis", value: Format.date(start))
                        }
                        if let end = store.subscription?.periodEnd {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Prochaine échéance", value: Format.date(end))
                        }
                    }
                }

                if store.subscription == nil {
                    Text("Aucun abonnement enregistré pour cette société.")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.mutedForeground)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Text("La facturation de l'abonnement et le changement de formule se font depuis le web.")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.mutedForeground)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(20)
            .frame(maxWidth: 700)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("Abonnement")
        .navigationBarTitleDisplayMode(.inline)
    }
}
