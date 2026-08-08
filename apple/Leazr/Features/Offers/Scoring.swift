import Foundation
import Observation
import SwiftUI
import Supabase

/// Décision d'analyse, reprise de `ScoringModal.tsx`.
enum OfferScore: String, CaseIterable, Identifiable {
    case a = "A"
    case b = "B"
    case c = "C"
    case d = "D"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .a: return "Validé"
        case .b: return "Documents demandés"
        case .c: return "Refusé"
        case .d: return "Sans suite"
        }
    }

    var detail: String {
        switch self {
        case .a: return "Le dossier passe à l'étape suivante."
        case .b: return "Des pièces complémentaires sont demandées au client."
        case .c: return "Le dossier est refusé, avec un motif."
        case .d: return "Le dossier est clos faute de suite du client."
        }
    }

    var icon: String {
        switch self {
        case .a: return "checkmark.circle.fill"
        case .b: return "doc.text.fill"
        case .c: return "xmark.circle.fill"
        case .d: return "person.slash.fill"
        }
    }

    var tint: Color {
        switch self {
        case .a: return Theme.emerald
        case .b: return Theme.amber
        case .c: return Theme.destructive
        case .d: return Theme.mutedForeground
        }
    }
}

/// Ce qu'une analyse produit, une fois les envois faits : le statut cible et
/// tout ce qui l'accompagne au journal.
struct ScoringOutcome {
    let score: OfferScore
    let targetStatus: String
    let reason: String?
    var rejectionCategory: String?
    var subReason: String?
}

// MARK: - Feuille d'analyse

/// Analyse interne ou leaser, avec la chaîne complète derrière chaque score.
///
/// Le web ne se contente pas de poser un score : B envoie la demande de pièces
/// et son lien d'upload, C envoie l'e-mail de refus, D l'e-mail de clôture —
/// chacun avec sa variante sans envoi. Un score posé seul laisse le client sans
/// nouvelle et le dossier sans suite possible.
struct ScoringSheet: View {

    @Environment(\.dismiss) private var dismiss

    let step: WorkflowStep
    let offer: Offer
    /// Applique le statut une fois les envois réussis.
    let onConfirm: (ScoringOutcome) async -> Bool

    @State private var score: OfferScore?
    @State private var comment = ""

    // Score B — demande de pièces
    @State private var selectedDocuments: Set<String> = []
    @State private var customDocument = ""
    @State private var clientMessage = ""
    @State private var channels: Set<DocumentChannel> = [.email]
    @State private var language: RequestLanguage = .fr

    // Scores C et D — motifs
    @State private var rejectionReason: String?
    @State private var noFollowUpReason: String?

    @State private var isWorking = false
    @State private var errorMessage: String?

    private var isLeaser: Bool { step.scoringType == "leaser" }
    private var family: String { isLeaser ? "leaser" : "internal" }
    private var title: String { isLeaser ? "Analyse leaser" : "Analyse interne" }

    private var documents: [String] {
        let custom = customDocument.trimmingCharacters(in: .whitespaces)
        return DocumentRequestOption.all
            .filter { selectedDocuments.contains($0.id) }
            .map(\.id)
            + (custom.isEmpty ? [] : ["custom:\(custom)"])
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage {
                        ErrorBanner(message: errorMessage)
                    }

                    FormSection(title: "Décision") {
                        VStack(spacing: 8) {
                            ForEach(OfferScore.allCases) { option in
                                ScoreChoiceRow(score: option, isSelected: score == option) {
                                    select(option)
                                }
                            }
                        }
                    }

                    switch score {
                    case .b:    documentRequestPanel
                    case .c:    rejectionPanel
                    case .d:    noFollowUpPanel
                    case .a:    commentSection(title: "Commentaire (optionnel)",
                                               placeholder: "Précisez votre approbation")
                    case nil:   EmptyView()
                    }

                    if score != nil { actions }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Annuler") { dismiss() }
                }
            }
        }
    }

    private func select(_ option: OfferScore) {
        score = option
        // Le web réinitialise les champs propres au score en changeant de
        // décision : garder un motif de refus sur un score B n'aurait aucun sens.
        comment = ""
        if option != .b {
            selectedDocuments = []
            customDocument = ""
            clientMessage = ""
        }
        if option != .c { rejectionReason = nil }
        if option != .d { noFollowUpReason = nil }
    }

    // MARK: Panneaux

    private func commentSection(title: String, placeholder: String) -> some View {
        FormSection(title: title) {
            LeazrTextArea(placeholder: placeholder, text: $comment)
        }
    }

    @ViewBuilder
    private var documentRequestPanel: some View {
        VStack(spacing: 18) {
            Text("Sélectionnez les pièces à demander. Un lien d'upload sécurisé sera envoyé sur les canaux choisis.")
                .font(.system(size: 13))
                .foregroundStyle(Theme.mutedForeground)
                .frame(maxWidth: .infinity, alignment: .leading)

            FormSection(title: "Langue de la demande") {
                HStack(spacing: 8) {
                    ForEach(RequestLanguage.allCases) { option in
                        SelectChip(
                            label: "\(option.flag) \(option.rawValue.uppercased())",
                            isSelected: language == option,
                            tint: Theme.amber
                        ) { language = option }
                    }
                }
            }

            FormSection(title: "Documents") {
                VStack(spacing: 8) {
                    ForEach(DocumentRequestOption.all) { option in
                        CheckRow(
                            label: option.label,
                            isChecked: selectedDocuments.contains(option.id)
                        ) {
                            if selectedDocuments.contains(option.id) {
                                selectedDocuments.remove(option.id)
                            } else {
                                selectedDocuments.insert(option.id)
                            }
                        }
                    }
                }
            }

            FormSection(title: "Autre document") {
                LeazrField(
                    icon: "doc.badge.plus",
                    placeholder: "Ex. preuve de domicile",
                    text: $customDocument,
                    autocapitalization: .sentences
                )
            }

            FormSection(title: "Message au client (optionnel)") {
                LeazrTextArea(placeholder: "Un mot personnalisé…", text: $clientMessage)
            }

            FormSection(title: "Canaux d'envoi") {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 8) {
                        ForEach(DocumentChannel.allCases) { channel in
                            SelectChip(
                                label: channel.label,
                                systemImage: channel.icon,
                                isSelected: channels.contains(channel),
                                tint: Theme.amber
                            ) {
                                if channels.contains(channel) {
                                    channels.remove(channel)
                                } else {
                                    channels.insert(channel)
                                }
                            }
                        }
                    }
                    Text("WhatsApp et SMS nécessitent un numéro sur la fiche client.")
                        .font(.system(size: 11))
                        .foregroundStyle(Theme.mutedForeground)
                }
            }

            commentSection(
                title: "Commentaire interne (optionnel)",
                placeholder: "Ajoutez un commentaire sur les documents requis…"
            )
        }
    }

    @ViewBuilder
    private var rejectionPanel: some View {
        VStack(spacing: 18) {
            FormSection(title: "Raison du refus") {
                VStack(spacing: 8) {
                    ForEach(RejectionReason.all, id: \.code) { option in
                        MotifChoiceRow(
                            label: option.label,
                            isSelected: rejectionReason == option.code
                        ) { rejectionReason = option.code }
                    }
                }
            }

            commentSection(
                title: "Complément d'information (optionnel)",
                placeholder: "Ajoutez des détails supplémentaires si nécessaire…"
            )

            Text("L'e-mail de refus est rédigé par le serveur dans la langue du client, à partir du gabarit du web.")
                .font(.system(size: 12))
                .foregroundStyle(Theme.mutedForeground)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    @ViewBuilder
    private var noFollowUpPanel: some View {
        VStack(spacing: 18) {
            FormSection(title: "Raison du classement sans suite") {
                VStack(spacing: 8) {
                    ForEach(OfferMotif.noFollowUp.filter { $0.code != "unknown" }, id: \.code) { option in
                        MotifChoiceRow(
                            label: option.label,
                            isSelected: noFollowUpReason == option.code
                        ) { noFollowUpReason = option.code }
                    }
                }
            }

            commentSection(
                title: "Commentaire (optionnel)",
                placeholder: "Ajoutez des détails supplémentaires si nécessaire…"
            )

            Text("L'e-mail de clôture est rédigé par le serveur dans la langue du client.")
                .font(.system(size: 12))
                .foregroundStyle(Theme.mutedForeground)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: Actions

    /// Comme le web : un bouton qui envoie, et un qui pose le score sans rien
    /// envoyer. Le second existe parce qu'on prévient parfois le client de vive
    /// voix.
    @ViewBuilder
    private var actions: some View {
        VStack(spacing: 10) {
            switch score {
            case .b:
                PrimaryButton(
                    title: "Valider B et envoyer la demande",
                    systemImage: "paperplane.fill",
                    isLoading: isWorking,
                    isEnabled: !documents.isEmpty && !channels.isEmpty
                ) {
                    Task { await submit(sendingNotification: true) }
                }
                TertiaryButton(title: "Valider B sans envoyer de demande", systemImage: "doc.text") {
                    Task { await submit(sendingNotification: false) }
                }

            case .c:
                PrimaryButton(
                    title: "Valider C et envoyer le refus",
                    systemImage: "envelope.fill",
                    isLoading: isWorking,
                    isEnabled: rejectionReason != nil
                ) {
                    Task { await submit(sendingNotification: true) }
                }
                TertiaryButton(title: "Valider C sans e-mail", systemImage: "xmark.circle") {
                    Task { await submit(sendingNotification: false) }
                }

            case .d:
                PrimaryButton(
                    title: "Classer et envoyer la clôture",
                    systemImage: "envelope.fill",
                    isLoading: isWorking,
                    isEnabled: noFollowUpReason != nil
                ) {
                    Task { await submit(sendingNotification: true) }
                }
                TertiaryButton(title: "Classer sans e-mail", systemImage: "person.slash") {
                    Task { await submit(sendingNotification: false) }
                }

            case .a:
                PrimaryButton(
                    title: "Confirmer",
                    systemImage: "checkmark.circle.fill",
                    isLoading: isWorking
                ) {
                    Task { await submit(sendingNotification: false) }
                }

            case nil:
                EmptyView()
            }
        }
    }

    // MARK: Enchaînement

    private func submit(sendingNotification: Bool) async {
        guard let score else { return }
        isWorking = true
        defer { isWorking = false }
        errorMessage = nil

        let trimmedComment = comment.trimmingCharacters(in: .whitespacesAndNewlines)
        var outcome: ScoringOutcome

        switch score {
        case .a:
            outcome = ScoringOutcome(
                score: .a,
                targetStatus: step.nextStepOnApproval ?? "\(family)_approved",
                reason: trimmedComment.isEmpty ? nil : trimmedComment
            )

        case .b:
            if sendingNotification {
                // L'envoi précède le changement de statut : marquer « documents
                // demandés » alors que rien n'est parti serait un mensonge.
                let result = await OfferNotifications.requestDocuments(
                    offerId: offer.id,
                    documents: documents,
                    message: clientMessage.trimmingCharacters(in: .whitespacesAndNewlines),
                    channels: channels.map(\.rawValue),
                    language: language.rawValue
                )
                guard result.success else {
                    errorMessage = result.detail.isEmpty
                        ? "Échec de l'envoi de la demande de documents."
                        : "Échec de l'envoi — \(result.detail)"
                    UINotificationFeedbackGenerator().notificationOccurred(.error)
                    return
                }
            }

            let list = documents.joined(separator: ", ")
            let base = sendingNotification
                ? "Documents demandés: \(list)"
                : (documents.isEmpty
                    ? "Score B attribué sans envoi d'email"
                    : "Documents notés (sans email): \(list)")

            outcome = ScoringOutcome(
                score: .b,
                targetStatus: step.nextStepOnDocsRequested ?? "\(family)_docs_requested",
                reason: trimmedComment.isEmpty ? base : "\(base) - \(trimmedComment)"
            )

        case .c:
            guard let rejectionReason else { return }

            if sendingNotification {
                guard await OfferNotifications.sendRejection(offerId: offer.id) else {
                    errorMessage = "Échec de l'envoi de l'e-mail de refus."
                    UINotificationFeedbackGenerator().notificationOccurred(.error)
                    return
                }
            }

            let label = RejectionReason.label(rejectionReason)
            outcome = ScoringOutcome(
                score: .c,
                targetStatus: step.nextStepOnRejection ?? "\(family)_rejected",
                reason: trimmedComment.isEmpty ? label : "\(label)\n\nComplément: \(trimmedComment)",
                rejectionCategory: rejectionReason
            )

        case .d:
            guard let noFollowUpReason else { return }

            if sendingNotification {
                guard await OfferNotifications.sendNoFollowUp(offerId: offer.id) else {
                    errorMessage = "Échec de l'envoi de l'e-mail de clôture."
                    UINotificationFeedbackGenerator().notificationOccurred(.error)
                    return
                }
            }

            let label = OfferMotif.noFollowUpLabel(noFollowUpReason)
            outcome = ScoringOutcome(
                score: .d,
                targetStatus: "without_follow_up",
                reason: trimmedComment.isEmpty ? label : "\(label)\n\nCommentaire: \(trimmedComment)",
                subReason: noFollowUpReason
            )
        }

        if await onConfirm(outcome) {
            dismiss()
        } else {
            errorMessage = "Le statut n'a pas pu être mis à jour."
        }
    }
}

// MARK: - Envois

/// Appels aux edge functions qui écrivent et envoient les messages au client.
/// Les gabarits et la langue vivent côté serveur : l'app ne fait que déclencher.
@MainActor
enum OfferNotifications {

    struct DocumentRequestResult {
        let success: Bool
        let detail: String
    }

    private struct DocumentResponse: Decodable {
        let success: Bool?
        let emailStatus: String?
        let whatsappStatus: String?
        let smsStatus: String?
        let message: String?

        enum CodingKeys: String, CodingKey {
            case success, message
            case emailStatus = "email_status"
            case whatsappStatus = "whatsapp_status"
            case smsStatus = "sms_status"
        }
    }

    static func requestDocuments(
        offerId: String,
        documents: [String],
        message: String,
        channels: [String],
        language: String
    ) async -> DocumentRequestResult {

        var body: [String: AnyJSON] = [
            "offer_id": .string(offerId),
            "documents": .array(documents.map { .string($0) }),
            "channels": .array(channels.map { .string($0) }),
            "language": .string(language),
        ]
        if !message.isEmpty { body["custom_message"] = .string(message) }

        do {
            let response: DocumentResponse = try await Backend.client.functions.invoke(
                "document-request",
                options: FunctionInvokeOptions(body: body)
            )

            // Un canal peut échouer sans que les autres échouent : on rapporte
            // le détail plutôt qu'un verdict global.
            let detail = [
                ("Email", response.emailStatus),
                ("WhatsApp", response.whatsappStatus),
                ("SMS", response.smsStatus),
            ]
            .compactMap { name, status -> String? in
                guard let status else { return nil }
                return "\(name) \(status == "sent" ? "✓" : "✗")"
            }
            .joined(separator: ", ")

            return DocumentRequestResult(
                success: response.success == true,
                detail: detail.isEmpty ? (response.message ?? "") : detail
            )
        } catch {
            return DocumentRequestResult(success: false, detail: "")
        }
    }

    /// E-mail de refus. Sans titre ni contenu, l'edge function reprend le
    /// gabarit du web dans la langue du client — exactement ce qu'affiche la
    /// modale de refus par défaut.
    static func sendRejection(offerId: String) async -> Bool {
        await invokeSilently("send-leasing-rejection-email", offerId: offerId)
    }

    static func sendNoFollowUp(offerId: String) async -> Bool {
        await invokeSilently("send-no-follow-up-email", offerId: offerId)
    }

    private struct EmptyResponse: Decodable {}

    private static func invokeSilently(_ name: String, offerId: String) async -> Bool {
        do {
            let _: EmptyResponse = try await Backend.client.functions.invoke(
                name,
                options: FunctionInvokeOptions(body: ["offerId": AnyJSON.string(offerId)])
            )
            return true
        } catch {
            return false
        }
    }
}

// MARK: - Motifs de refus

/// Libellés de `REJECTION_REASONS` dans `ScoringModal.tsx`. Ils diffèrent de
/// ceux du filtre de liste, plus courts : ici c'est le vocabulaire de décision.
enum RejectionReason {
    static let all: [(code: String, label: String)] = [
        ("fraud", "REFUS — client suspect / fraude"),
        ("young_company", "REFUS — entreprise trop jeune / montant demandé"),
        ("private_client", "REFUS — client particulier"),
        ("financial_situation", "REFUS — situation financière insuffisante"),
        ("other", "REFUS — autre raison"),
    ]

    static func label(_ code: String) -> String {
        all.first { $0.code == code }?.label ?? code
    }
}

// MARK: - Composants

struct ScoreChoiceRow: View {
    let score: OfferScore
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        } label: {
            HStack(spacing: 12) {
                ZStack {
                    Circle().fill(score.tint.opacity(0.16)).frame(width: 36, height: 36)
                    Image(systemName: score.icon)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(score.tint)
                }

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(score.rawValue)
                            .font(.system(size: 12, weight: .black))
                            .foregroundStyle(score.tint)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Capsule().fill(score.tint.opacity(0.16)))
                        Text(score.title)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Theme.foreground)
                    }
                    Text(score.detail)
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                        .multilineTextAlignment(.leading)
                }

                Spacer(minLength: 4)

                Image(systemName: isSelected ? "largecircle.fill.circle" : "circle")
                    .font(.system(size: 20))
                    .foregroundStyle(isSelected ? score.tint : Theme.border)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                    .fill(Theme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                    .strokeBorder(isSelected ? score.tint : Theme.border, lineWidth: isSelected ? 1.6 : 1)
            )
        }
        .buttonStyle(PressableStyle())
    }
}

struct MotifChoiceRow: View {
    let label: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: isSelected ? "largecircle.fill.circle" : "circle")
                    .font(.system(size: 18))
                    .foregroundStyle(isSelected ? Theme.primary : Theme.border)
                Text(label)
                    .font(.system(size: 14))
                    .foregroundStyle(Theme.foreground)
                    .multilineTextAlignment(.leading)
                Spacer(minLength: 0)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                    .fill(Theme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                    .strokeBorder(isSelected ? Theme.primary : Theme.border, lineWidth: isSelected ? 1.6 : 1)
            )
        }
        .buttonStyle(PressableStyle())
    }
}
