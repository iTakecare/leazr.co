import Foundation
import Observation
import SwiftUI
import Supabase

/// Demande de pièces au client, reprise de `RequestDocumentsDialog.tsx`.
///
/// Tout le travail — lien d'upload, gabarits multilingues, envoi e-mail,
/// WhatsApp et SMS — est fait par l'edge function `document-request`. L'app
/// n'a qu'à composer la même charge utile, ce qui garantit des messages
/// identiques quel que soit l'appareil.
struct DocumentRequestSheet: View {

    @Environment(\.dismiss) private var dismiss

    let offerId: String
    let onSent: () async -> Void

    @State private var selected: Set<String> = []
    @State private var customDocument = ""
    @State private var message = ""
    @State private var channels: Set<DocumentChannel> = [.email]
    @State private var language: RequestLanguage = .fr
    @State private var isSending = false
    @State private var errorMessage: String?
    @State private var resultMessage: String?

    private var documents: [String] {
        let custom = customDocument.trimmingCharacters(in: .whitespaces)
        return DocumentRequestOption.all
            .filter { selected.contains($0.id) }
            .map(\.id)
            + (custom.isEmpty ? [] : ["custom:\(custom)"])
    }

    private var canSend: Bool { !documents.isEmpty && !channels.isEmpty }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage {
                        ErrorBanner(message: errorMessage)
                    }

                    if let resultMessage {
                        Text(resultMessage)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(Theme.emerald)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    FormSection(title: "Documents demandés") {
                        VStack(spacing: 8) {
                            ForEach(DocumentRequestOption.all) { option in
                                CheckRow(
                                    label: option.label,
                                    isChecked: selected.contains(option.id)
                                ) {
                                    if selected.contains(option.id) {
                                        selected.remove(option.id)
                                    } else {
                                        selected.insert(option.id)
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
                        LeazrTextArea(placeholder: "Un mot personnalisé…", text: $message)
                    }

                    FormSection(title: "Langue de la demande") {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(spacing: 8) {
                                ForEach(RequestLanguage.allCases) { option in
                                    SelectChip(
                                        label: "\(option.flag) \(option.rawValue.uppercased())",
                                        isSelected: language == option,
                                        tint: Theme.emerald
                                    ) { language = option }
                                }
                            }
                            Text("Le courriel et le SMS/WhatsApp seront rédigés dans cette langue.")
                                .font(.system(size: 11))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }

                    FormSection(title: "Canaux d'envoi") {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(spacing: 8) {
                                ForEach(DocumentChannel.allCases) { channel in
                                    SelectChip(
                                        label: channel.label,
                                        systemImage: channel.icon,
                                        isSelected: channels.contains(channel),
                                        tint: Theme.emerald
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

                    PrimaryButton(
                        title: "Envoyer la demande",
                        systemImage: "paperplane.fill",
                        isLoading: isSending,
                        isEnabled: canSend
                    ) {
                        Task { await send() }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Demander des documents")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Annuler") { dismiss() }
                }
            }
        }
    }

    private struct Response: Decodable {
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

    private func send() async {
        isSending = true
        defer { isSending = false }
        errorMessage = nil

        let trimmed = message.trimmingCharacters(in: .whitespacesAndNewlines)
        var body: [String: AnyJSON] = [
            "offer_id": .string(offerId),
            "documents": .array(documents.map { .string($0) }),
            "channels": .array(channels.map { .string($0.rawValue) }),
            "language": .string(language.rawValue),
        ]
        if !trimmed.isEmpty { body["custom_message"] = .string(trimmed) }

        do {
            let response: Response = try await Backend.client.functions.invoke(
                "document-request",
                options: FunctionInvokeOptions(body: body)
            )

            // Un canal peut échouer sans que les autres échouent : on rapporte
            // le détail plutôt qu'un verdict global trompeur.
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

            if response.success == true {
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                resultMessage = detail.isEmpty ? "Demande envoyée." : "Demande envoyée — \(detail)"
                await onSent()
                dismiss()
            } else {
                UINotificationFeedbackGenerator().notificationOccurred(.error)
                errorMessage = [response.message, detail.isEmpty ? nil : detail]
                    .compactMap { $0 }
                    .joined(separator: " — ")
                    .ifEmpty("Envoi impossible.")
            }
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            errorMessage = "Envoi impossible."
        }
    }
}

private extension String {
    func ifEmpty(_ fallback: String) -> String { isEmpty ? fallback : self }
}

// MARK: - Options

/// Pièces proposées, identiques à `DOCUMENT_OPTIONS` du web.
struct DocumentRequestOption: Identifiable {
    let id: String
    let label: String

    static let all: [DocumentRequestOption] = [
        .init(id: "balance_sheet", label: "Bilan financier"),
        .init(id: "provisional_balance", label: "Bilan financier provisoire récent"),
        .init(id: "tax_notice", label: "Avertissement extrait de rôle (BE)"),
        .init(id: "tax_return", label: "Liasse fiscale (FR)"),
        .init(id: "id_card_front", label: "Carte d'identité — Recto"),
        .init(id: "id_card_back", label: "Carte d'identité — Verso"),
        .init(id: "company_register", label: "Extrait de registre d'entreprise"),
        .init(id: "vat_certificate", label: "Attestation TVA"),
        .init(id: "bank_statement", label: "Relevé bancaire des 3 derniers mois"),
    ]
}

enum DocumentChannel: String, CaseIterable, Identifiable {
    case email, whatsapp, sms

    var id: String { rawValue }

    var label: String {
        switch self {
        case .email:    return "Email"
        case .whatsapp: return "WhatsApp"
        case .sms:      return "SMS"
        }
    }

    var icon: String {
        switch self {
        case .email:    return "envelope.fill"
        case .whatsapp: return "message.fill"
        case .sms:      return "iphone"
        }
    }
}

enum RequestLanguage: String, CaseIterable, Identifiable {
    case fr, nl, en, de

    var id: String { rawValue }

    var flag: String {
        switch self {
        case .fr: return "🇫🇷"
        case .nl: return "🇳🇱"
        case .en: return "🇬🇧"
        case .de: return "🇩🇪"
        }
    }
}

// MARK: - Composants de sélection

struct CheckRow: View {
    let label: String
    let isChecked: Bool
    let action: () -> Void

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: isChecked ? "checkmark.square.fill" : "square")
                    .font(.system(size: 19))
                    .foregroundStyle(isChecked ? Theme.emerald : Theme.border)
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
                    .strokeBorder(isChecked ? Theme.emerald : Theme.border, lineWidth: isChecked ? 1.5 : 1)
            )
        }
        .buttonStyle(PressableStyle())
    }
}

/// Pastille de sélection compacte, pour les choix qui tiennent sur une ligne.
struct SelectChip: View {
    let label: String
    var systemImage: String?
    let isSelected: Bool
    var tint: Color = Theme.primary
    let action: () -> Void

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        } label: {
            HStack(spacing: 5) {
                if let systemImage {
                    Image(systemName: systemImage).font(.system(size: 12, weight: .semibold))
                }
                Text(label).font(.system(size: 13, weight: .semibold))
            }
            .foregroundStyle(isSelected ? .white : Theme.mutedForeground)
            .frame(maxWidth: .infinity)
            .frame(height: 38)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(isSelected ? tint : Theme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .strokeBorder(isSelected ? tint : Theme.border, lineWidth: 1)
            )
        }
        .buttonStyle(PressableStyle())
    }
}
