import Foundation
import Observation
import SwiftUI
import Supabase

/// Onglet « Actions » du dossier : tout ce que le web propose dans sa barre
/// latérale, regroupé par intention plutôt qu'en liste plate.
struct OfferActionsSection: View {

    let offer: Offer
    let signature: OfferSignature?
    let onChanged: () async -> Void

    @State private var isEditing = false
    @State private var isEmailing = false
    @State private var isRequestingInfo = false
    @State private var isReminding = false
    @State private var isCreatingTask = false
    @State private var isEditingDate = false
    @State private var isDeleting = false
    @State private var isDuplicating = false

    @State private var pdf: OfferActions.GeneratedPDF?
    @State private var uploadURL: URL?
    @State private var isWorking = false
    @State private var message: String?
    @State private var errorMessage: String?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 14) {
            if let errorMessage {
                ErrorBanner(message: errorMessage)
            }
            if let message {
                InfoBanner(message: message)
            }

            group("Document") {
                ActionRow(
                    icon: "doc.richtext.fill",
                    tint: Theme.sky,
                    title: "Générer le PDF",
                    subtitle: "Offre commerciale composée par le serveur",
                    isBusy: isWorking
                ) { Task { await makePDF() } }

                if let pdf {
                    ShareLink(item: pdf.url) {
                        ActionRowLabel(
                            icon: "square.and.arrow.up",
                            tint: Theme.violet,
                            title: "Partager le PDF",
                            subtitle: pdf.fileName
                        )
                    }
                }

                ActionRow(
                    icon: "envelope.fill",
                    tint: Theme.primary,
                    title: "Envoyer l'offre par e-mail",
                    subtitle: "Avec le PDF en pièce jointe"
                ) { isEmailing = true }
            }

            group("Client") {
                if let link = OfferActions.publicLink(offerId: offer.id) {
                    Link(destination: link) {
                        ActionRowLabel(
                            icon: "safari.fill",
                            tint: Theme.teal,
                            title: "Aperçu client",
                            subtitle: "Ouvrir la page publique de l'offre"
                        )
                    }

                    ActionRow(
                        icon: "doc.on.doc.fill",
                        tint: Theme.mutedForeground,
                        title: "Copier le lien public",
                        subtitle: link.absoluteString
                    ) {
                        UIPasteboard.general.string = link.absoluteString
                        UINotificationFeedbackGenerator().notificationOccurred(.success)
                        message = "Lien copié."
                    }
                }

                ActionRow(
                    icon: "arrow.up.doc.fill",
                    tint: Theme.amber,
                    title: "Lien de dépôt de documents",
                    subtitle: "Valable 7 jours",
                    isBusy: isWorking
                ) { Task { await makeUploadLink() } }

                if let uploadURL {
                    ShareLink(item: uploadURL) {
                        ActionRowLabel(
                            icon: "square.and.arrow.up",
                            tint: Theme.amber,
                            title: "Partager le lien de dépôt",
                            subtitle: uploadURL.absoluteString
                        )
                    }
                }

                ActionRow(
                    icon: "questionmark.circle.fill",
                    tint: Theme.violet,
                    title: "Demander des informations",
                    subtitle: "Message libre au client"
                ) { isRequestingInfo = true }

                ActionRow(
                    icon: "bell.badge.fill",
                    tint: Theme.rose,
                    title: "Envoyer une relance",
                    subtitle: "Rappel documents ou rappel offre"
                ) { isReminding = true }
            }

            group("Dossier") {
                ActionRow(
                    icon: "square.and.pencil",
                    tint: Theme.primary,
                    title: "Modifier la demande",
                    subtitle: "Équipements, quantités et marges"
                ) { isEditing = true }

                ActionRow(
                    icon: "calendar",
                    tint: Theme.sky,
                    title: "Modifier la date",
                    subtitle: Format.date(offer.createdAt)
                ) { isEditingDate = true }

                ActionRow(
                    icon: "doc.on.doc",
                    tint: Theme.teal,
                    title: "Dupliquer la demande",
                    subtitle: "Nouveau dossier en brouillon",
                    isBusy: isDuplicating
                ) { Task { await duplicate() } }

                ActionRow(
                    icon: "checkmark.square.fill",
                    tint: Theme.emerald,
                    title: "Créer une tâche",
                    subtitle: "Rattachée à cette demande"
                ) { isCreatingTask = true }

                ActionRow(
                    icon: "trash.fill",
                    tint: Theme.destructive,
                    title: "Supprimer la demande",
                    subtitle: "Le matériel réservé sera relibéré"
                ) { isDeleting = true }
            }
        }
        .sheet(isPresented: $isEditing) {
            EditOfferView(offer: offer) { await onChanged() }
        }
        .sheet(isPresented: $isEmailing) {
            SendOfferEmailSheet(offer: offer) { await onChanged() }
        }
        .sheet(isPresented: $isRequestingInfo) {
            RequestInfoSheet(offer: offer) { await onChanged() }
        }
        .sheet(isPresented: $isReminding) {
            SendReminderSheet(offer: offer) { await onChanged() }
        }
        .sheet(isPresented: $isCreatingTask) {
            CreateTaskSheet(offer: offer)
        }
        .sheet(isPresented: $isEditingDate) {
            OfferDateSheet(offer: offer) { await onChanged() }
        }
        .alert("Supprimer cette demande ?", isPresented: $isDeleting) {
            Button("Annuler", role: .cancel) {}
            Button("Supprimer", role: .destructive) { Task { await remove() } }
        } message: {
            Text("Le dossier \(offer.dossierNumber ?? offer.clientName) sera définitivement supprimé, et le matériel qu'il réservait remis en stock.")
        }
    }

    // MARK: Mise en page

    @ViewBuilder
    private func group<Content: View>(
        _ title: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title.uppercased())
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Theme.mutedForeground)
                .padding(.leading, 4)
            VStack(spacing: 8) { content() }
        }
    }

    // MARK: Actions

    private func makePDF() async {
        isWorking = true
        defer { isWorking = false }
        errorMessage = nil
        do {
            pdf = try await OfferActions.generatePDF(offerId: offer.id)
            message = "PDF prêt : \(pdf?.fileName ?? "")"
            OfferActions.logEvent(offerId: offer.id, type: "pdf_generated", description: "PDF d'offre généré depuis l'application")
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "Génération du PDF impossible."
        }
    }

    private func makeUploadLink() async {
        isWorking = true
        defer { isWorking = false }
        errorMessage = nil
        do {
            uploadURL = try await OfferActions.uploadLink(
                offerId: offer.id,
                documents: ["balance_sheet", "id_card_front", "id_card_back"]
            )
            message = "Lien de dépôt prêt."
        } catch {
            errorMessage = "Le lien de dépôt n'a pas pu être créé."
        }
    }

    private func duplicate() async {
        isDuplicating = true
        defer { isDuplicating = false }
        errorMessage = nil
        do {
            let clone = try await OfferActions.duplicate(offerId: offer.id)
            message = "Dossier dupliqué : \(clone.dossierNumber ?? clone.offerId)"
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            await onChanged()
        } catch {
            errorMessage = "Duplication impossible."
        }
    }

    private func remove() async {
        do {
            try await OfferActions.delete(offerId: offer.id)
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            await onChanged()
            dismiss()
        } catch {
            errorMessage = "Suppression impossible."
        }
    }
}

// MARK: - Composants d'action

struct ActionRowLabel: View {
    let icon: String
    let tint: Color
    let title: String
    var subtitle: String?
    var isBusy = false

    var body: some View {
        HStack(spacing: 13) {
            ZStack {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(tint.opacity(0.15))
                    .frame(width: 38, height: 38)
                if isBusy {
                    ProgressView().controlSize(.small).tint(tint)
                } else {
                    Image(systemName: icon)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(tint)
                }
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Theme.foreground)
                    .multilineTextAlignment(.leading)
                if let subtitle {
                    Text(subtitle)
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                        .lineLimit(1)
                        .truncationMode(.middle)
                }
            }

            Spacer(minLength: 0)

            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Theme.mutedForeground)
        }
        .padding(13)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                .fill(Theme.surface)
        )
    }
}

struct ActionRow: View {
    let icon: String
    let tint: Color
    let title: String
    var subtitle: String?
    var isBusy = false
    let action: () -> Void

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        } label: {
            ActionRowLabel(icon: icon, tint: tint, title: title, subtitle: subtitle, isBusy: isBusy)
        }
        .buttonStyle(PressableStyle())
        .disabled(isBusy)
    }
}

/// Bandeau d'information positif, pendant du bandeau d'erreur.
struct InfoBanner: View {
    let message: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill").font(.system(size: 14))
            Text(message).font(.system(size: 13, weight: .medium))
            Spacer(minLength: 0)
        }
        .foregroundStyle(Theme.emerald)
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Theme.emerald.opacity(0.12))
        )
    }
}

// MARK: - Envoi de l'offre

struct SendOfferEmailSheet: View {

    @Environment(\.dismiss) private var dismiss

    let offer: Offer
    let onSent: () async -> Void

    @State private var recipient = ""
    @State private var subject = ""
    @State private var message = ""
    @State private var includePDF = true
    @State private var isSending = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage {
                        ErrorBanner(message: errorMessage)
                    }

                    FormSection(title: "Destinataire") {
                        LeazrField(
                            icon: "envelope",
                            placeholder: "adresse@client.be",
                            text: $recipient,
                            textContentType: .emailAddress,
                            keyboardType: .emailAddress
                        )
                    }

                    FormSection(title: "Objet") {
                        LeazrField(
                            icon: "text.alignleft",
                            placeholder: "Objet de l'e-mail",
                            text: $subject,
                            autocapitalization: .sentences
                        )
                    }

                    FormSection(title: "Message") {
                        LeazrTextArea(placeholder: "Votre message au client", text: $message)
                    }

                    Toggle("Joindre le PDF de l'offre", isOn: $includePDF)
                        .tint(Theme.primary)
                        .font(.system(size: 15))
                        .padding(.horizontal, 16)
                        .frame(height: 52)
                        .background(
                            RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                .fill(Theme.surface)
                        )

                    PrimaryButton(
                        title: "Envoyer",
                        systemImage: "paperplane.fill",
                        isLoading: isSending,
                        isEnabled: recipient.contains("@") && !subject.isEmpty
                    ) {
                        Task { await send() }
                    }

                    Text("Un dossier encore en brouillon passera automatiquement en « Offre envoyée ».")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Envoyer l'offre")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .task { await prefill() }
        }
    }

    private func prefill() async {
        guard recipient.isEmpty else { return }

        struct Row: Decodable {
            let clientEmail: String?
            enum CodingKeys: String, CodingKey { case clientEmail = "client_email" }
        }
        let rows: [Row] = (try? await Backend.client
            .from("offers").select("client_email").eq("id", value: offer.id).limit(1)
            .execute().value) ?? []
        recipient = rows.first?.clientEmail ?? ""

        let number = offer.dossierNumber ?? ""
        subject = number.isEmpty
            ? "Votre offre est prête à signer"
            : "Votre offre \(number) est prête à signer"
        message = """
        Bonjour,

        Vous trouverez ci-joint votre offre pour un montant de \(Format.currency(offer.monthlyPayment)) hors TVA par mois.

        Vous pouvez la consulter et la signer en ligne via le lien qui vous a été transmis.

        Bien à vous,
        """
    }

    private func send() async {
        isSending = true
        defer { isSending = false }
        errorMessage = nil
        do {
            try await OfferActions.sendOfferEmail(
                offerId: offer.id,
                to: recipient.trimmingCharacters(in: .whitespaces),
                subject: subject,
                message: message,
                includePDF: includePDF
            )
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            await onSent()
            dismiss()
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "Envoi impossible."
        }
    }
}

// MARK: - Demande d'informations

/// Message libre au client, envoyé par le canal e-mail de la demande de
/// documents — c'est le même mécanisme que `RequestInfoModal`.
struct RequestInfoSheet: View {

    @Environment(\.dismiss) private var dismiss

    let offer: Offer
    let onSent: () async -> Void

    @State private var message = ""
    @State private var language: RequestLanguage = .fr
    @State private var isSending = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage {
                        ErrorBanner(message: errorMessage)
                    }

                    FormSection(title: "Ce que vous attendez du client") {
                        LeazrTextArea(
                            placeholder: "Ex. merci de préciser le nombre de postes concernés",
                            text: $message
                        )
                    }

                    FormSection(title: "Langue") {
                        HStack(spacing: 8) {
                            ForEach(RequestLanguage.allCases) { option in
                                SelectChip(
                                    label: "\(option.flag) \(option.rawValue.uppercased())",
                                    isSelected: language == option,
                                    tint: Theme.violet
                                ) { language = option }
                            }
                        }
                    }

                    PrimaryButton(
                        title: "Envoyer la demande",
                        systemImage: "paperplane.fill",
                        isLoading: isSending,
                        isEnabled: !message.trimmingCharacters(in: .whitespaces).isEmpty
                    ) {
                        Task { await send() }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Demander des informations")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
        }
    }

    private func send() async {
        isSending = true
        defer { isSending = false }
        errorMessage = nil

        // On passe par `document-request` avec une pièce libre : c'est le seul
        // canal qui sait joindre le lien de dépôt et gérer les quatre langues.
        let result = await OfferNotifications.requestDocuments(
            offerId: offer.id,
            documents: ["custom:Informations complémentaires"],
            message: message.trimmingCharacters(in: .whitespacesAndNewlines),
            channels: ["email"],
            language: language.rawValue
        )

        if result.success {
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            OfferActions.logEvent(
                offerId: offer.id,
                type: "info_requested",
                description: "Demande d'informations envoyée au client"
            )
            await onSent()
            dismiss()
        } else {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            errorMessage = result.detail.isEmpty ? "Envoi impossible." : result.detail
        }
    }
}

// MARK: - Relances

struct SendReminderSheet: View {

    @Environment(\.dismiss) private var dismiss

    let offer: Offer
    let onSent: () async -> Void

    @State private var sent: [SentReminder] = []
    @State private var selected: ReminderChoice?
    @State private var language: RequestLanguage = .fr
    @State private var customMessage = ""
    @State private var includePDF = false
    @State private var isSending = false
    @State private var errorMessage: String?

    struct SentReminder: Decodable, Identifiable {
        let id: String
        let reminderType: String
        let reminderLevel: Int
        let sentAt: Date?

        enum CodingKeys: String, CodingKey {
            case id
            case reminderType = "reminder_type"
            case reminderLevel = "reminder_level"
            case sentAt = "sent_at"
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            id = try c.decode(String.self, forKey: .id)
            reminderType = try c.decodeIfPresent(String.self, forKey: .reminderType) ?? ""
            reminderLevel = try c.decodeIfPresent(Int.self, forKey: .reminderLevel) ?? 0
            if let raw = try c.decodeIfPresent(String.self, forKey: .sentAt) {
                sentAt = Format.parseDate(raw)
            } else { sentAt = nil }
        }
    }

    struct ReminderChoice: Identifiable, Equatable {
        let type: String
        let level: Int
        var id: String { "\(type)-\(level)" }

        var label: String {
            type == "document_reminder" ? "Documents — niveau \(level)" : "Offre — niveau \(level)"
        }

        var tint: Color {
            let base: Color = type == "document_reminder" ? Theme.amber : Theme.primary
            return level >= 3 ? Theme.destructive : base
        }
    }

    /// Les relances proposées dépendent du statut, comme sur le web : on ne
    /// relance pas sur des documents quand aucun n'a été demandé.
    private var choices: [ReminderChoice] {
        let status = offer.currentStep
        var result: [ReminderChoice] = []
        if ["info_requested", "internal_docs_requested"].contains(status) {
            result += (1...3).map { ReminderChoice(type: "document_reminder", level: $0) }
        }
        if ["sent", "offer_send", "accepted"].contains(status) {
            result += (1...3).map { ReminderChoice(type: "offer_reminder", level: $0) }
        }
        return result
    }

    private func alreadySent(_ choice: ReminderChoice) -> Bool {
        sent.contains {
            $0.reminderType == choice.type && $0.reminderLevel == choice.level && $0.sentAt != nil
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage {
                        ErrorBanner(message: errorMessage)
                    }

                    if choices.isEmpty {
                        EmptyHint(
                            icon: "bell.slash",
                            label: "Aucune relance ne s'applique au statut actuel"
                        )
                    } else {
                        FormSection(title: "Relance à envoyer") {
                            VStack(spacing: 8) {
                                ForEach(choices) { choice in
                                    ReminderChoiceRow(
                                        choice: choice,
                                        isSent: alreadySent(choice),
                                        isSelected: selected == choice
                                    ) { selected = choice }
                                }
                            }
                        }

                        FormSection(title: "Langue") {
                            HStack(spacing: 8) {
                                ForEach(RequestLanguage.allCases) { option in
                                    SelectChip(
                                        label: "\(option.flag) \(option.rawValue.uppercased())",
                                        isSelected: language == option,
                                        tint: Theme.rose
                                    ) { language = option }
                                }
                            }
                        }

                        FormSection(title: "Message personnalisé (optionnel)") {
                            LeazrTextArea(placeholder: "Un mot en plus du gabarit", text: $customMessage)
                        }

                        Toggle("Joindre le PDF de l'offre", isOn: $includePDF)
                            .tint(Theme.primary)
                            .font(.system(size: 15))
                            .padding(.horizontal, 16)
                            .frame(height: 52)
                            .background(
                                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                    .fill(Theme.surface)
                            )

                        PrimaryButton(
                            title: "Envoyer la relance",
                            systemImage: "bell.badge.fill",
                            isLoading: isSending,
                            isEnabled: selected != nil
                        ) {
                            Task { await send() }
                        }
                    }

                    if !sent.isEmpty {
                        SectionHeader(title: "Déjà envoyées", count: sent.count)
                        ForEach(sent) { reminder in
                            Card {
                                HStack {
                                    Text(
                                        reminder.reminderType == "document_reminder"
                                            ? "Documents — niveau \(reminder.reminderLevel)"
                                            : "Offre — niveau \(reminder.reminderLevel)"
                                    )
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundStyle(Theme.foreground)
                                    Spacer()
                                    Text(Format.date(reminder.sentAt))
                                        .font(.system(size: 12))
                                        .foregroundStyle(Theme.mutedForeground)
                                }
                            }
                        }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Relancer le client")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .task { await load() }
        }
    }

    private func load() async {
        sent = (try? await Backend.client
            .from("offer_reminders")
            .select("id, reminder_type, reminder_level, sent_at")
            .eq("offer_id", value: offer.id)
            .order("created_at", ascending: false)
            .execute().value) ?? []

        // On propose d'emblée le premier niveau non encore envoyé.
        selected = choices.first { !alreadySent($0) } ?? choices.first
    }

    private func send() async {
        guard let selected else { return }
        isSending = true
        defer { isSending = false }
        errorMessage = nil
        do {
            try await OfferActions.sendReminder(
                offerId: offer.id,
                type: selected.type,
                level: selected.level,
                language: language.rawValue,
                customMessage: customMessage.isEmpty ? nil : customMessage,
                includePDF: includePDF
            )
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            await onSent()
            dismiss()
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "Envoi impossible."
        }
    }
}

struct ReminderChoiceRow: View {
    let choice: SendReminderSheet.ReminderChoice
    let isSent: Bool
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: isSelected ? "largecircle.fill.circle" : "circle")
                    .font(.system(size: 19))
                    .foregroundStyle(isSelected ? choice.tint : Theme.border)

                Text(choice.label)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Theme.foreground)

                Spacer(minLength: 8)

                // Un niveau déjà envoyé reste sélectionnable — on relance
                // parfois deux fois — mais il faut le savoir.
                if isSent {
                    Text("Déjà envoyée")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Theme.mutedForeground)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Capsule().fill(Theme.border.opacity(0.5)))
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                    .fill(Theme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                    .strokeBorder(isSelected ? choice.tint : Theme.border, lineWidth: isSelected ? 1.6 : 1)
            )
        }
        .buttonStyle(PressableStyle())
    }
}

// MARK: - Tâche

struct CreateTaskSheet: View {

    @Environment(\.dismiss) private var dismiss
    let offer: Offer

    @State private var title = ""
    @State private var details = ""
    @State private var priority = "medium"
    @State private var hasDueDate = true
    @State private var dueDate = Date().addingTimeInterval(86_400)
    @State private var isSaving = false
    @State private var errorMessage: String?

    private static let priorities: [(code: String, label: String, tint: Color)] = [
        ("low", "Basse", Theme.mutedForeground),
        ("medium", "Moyenne", Theme.sky),
        ("high", "Haute", Theme.amber),
        ("urgent", "Urgente", Theme.destructive),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage {
                        ErrorBanner(message: errorMessage)
                    }

                    FormSection(title: "Intitulé") {
                        LeazrField(
                            icon: "checkmark.square",
                            placeholder: "Ex. rappeler le client demain",
                            text: $title,
                            autocapitalization: .sentences
                        )
                    }

                    FormSection(title: "Détail") {
                        LeazrTextArea(placeholder: "Ce qu'il y a à faire", text: $details)
                    }

                    FormSection(title: "Priorité") {
                        HStack(spacing: 8) {
                            ForEach(Self.priorities, id: \.code) { option in
                                SelectChip(
                                    label: option.label,
                                    isSelected: priority == option.code,
                                    tint: option.tint
                                ) { priority = option.code }
                            }
                        }
                    }

                    FormSection(title: "Échéance") {
                        VStack(spacing: 10) {
                            Toggle("Fixer une échéance", isOn: $hasDueDate)
                                .tint(Theme.primary)
                                .font(.system(size: 15))
                                .padding(.horizontal, 16)
                                .frame(height: 50)
                                .background(
                                    RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                        .fill(Theme.surface)
                                )
                            if hasDueDate {
                                DatePicker("", selection: $dueDate)
                                    .datePickerStyle(.compact)
                                    .labelsHidden()
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(.horizontal, 16)
                                    .frame(height: 54)
                                    .background(
                                        RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                            .fill(Theme.surface)
                                    )
                            }
                        }
                    }

                    PrimaryButton(
                        title: "Créer la tâche",
                        systemImage: "plus.circle.fill",
                        isLoading: isSaving,
                        isEnabled: !title.trimmingCharacters(in: .whitespaces).isEmpty
                    ) {
                        Task { await save() }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Nouvelle tâche")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .onAppear {
                if title.isEmpty { title = "Suivi — \(offer.clientName)" }
            }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        errorMessage = nil

        guard let companyId = await Session.shared.resolve(),
              let userId = Session.shared.userId else {
            errorMessage = "Société introuvable."
            return
        }

        var payload: [String: AnyJSON] = [
            "company_id": .string(companyId),
            "title": .string(title.trimmingCharacters(in: .whitespaces)),
            "description": details.isEmpty ? .null : .string(details),
            "priority": .string(priority),
            "status": .string("todo"),
            "created_by": .string(userId),
            "assigned_to": .string(userId),
            "related_offer_id": .string(offer.id),
        ]
        if let clientId = offer.clientId {
            payload["related_client_id"] = .string(clientId)
        }
        if hasDueDate {
            payload["due_date"] = .string(ISO8601DateFormatter.leazrTimestamp.string(from: dueDate))
        }

        do {
            try await Backend.client.from("tasks").insert(payload).execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            dismiss()
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            errorMessage = "Création impossible."
        }
    }
}

// MARK: - Date de la demande

struct OfferDateSheet: View {

    @Environment(\.dismiss) private var dismiss
    let offer: Offer
    let onSaved: () async -> Void

    @State private var date = Date()
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage {
                        ErrorBanner(message: errorMessage)
                    }

                    FormSection(title: "Date de la demande") {
                        DatePicker("", selection: $date, displayedComponents: .date)
                            .datePickerStyle(.graphical)
                            .tint(Theme.primary)
                            .padding(8)
                            .background(
                                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                    .fill(Theme.surface)
                            )
                    }

                    Text("Cette date sert de référence pour les relances et le reporting.")
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
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Modifier la date")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .onAppear { date = offer.createdAt ?? Date() }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }
        do {
            try await OfferActions.updateDate(offerId: offer.id, to: date)
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            await onSaved()
            dismiss()
        } catch {
            errorMessage = "Enregistrement impossible."
        }
    }
}
