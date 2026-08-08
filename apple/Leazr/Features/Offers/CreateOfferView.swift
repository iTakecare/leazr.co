import Foundation
import Observation
import SwiftUI
import Supabase

/// Création d'une demande.
///
/// Volontairement minimale : le client, l'équipement et les conditions
/// financières. Le web reste l'outil de référence pour composer une offre
/// complète — ici on capte l'essentiel en mobilité, quitte à l'enrichir ensuite.
struct CreateOfferView: View {

    @Environment(\.dismiss) private var dismiss

    @State private var clientName = ""
    @State private var clientEmail = ""
    @State private var equipment = ""
    @State private var amount = ""
    @State private var monthly = ""
    @State private var duration = 36
    @State private var isSaving = false
    @State private var error: String?

    /// Callback pour rafraîchir la liste appelante après création.
    var onCreated: () -> Void = {}

    private var canSubmit: Bool {
        !clientName.trimmingCharacters(in: .whitespaces).isEmpty && !isSaving
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let error {
                        ErrorBanner(message: error)
                    }

                    FormSection(title: "Client") {
                        LeazrField(
                            icon: "person.fill",
                            placeholder: "Nom du client",
                            text: $clientName,
                            textContentType: .organizationName
                        )
                        LeazrField(
                            icon: "envelope.fill",
                            placeholder: "E-mail (optionnel)",
                            text: $clientEmail,
                            textContentType: .emailAddress,
                            keyboardType: .emailAddress
                        )
                    }

                    FormSection(title: "Équipement") {
                        LeazrTextArea(
                            placeholder: "Description du matériel",
                            text: $equipment
                        )
                    }

                    FormSection(title: "Conditions") {
                        LeazrField(
                            icon: "eurosign",
                            placeholder: "Montant financé",
                            text: $amount,
                            keyboardType: .decimalPad
                        )
                        LeazrField(
                            icon: "calendar",
                            placeholder: "Mensualité",
                            text: $monthly,
                            keyboardType: .decimalPad
                        )

                        HStack {
                            Text("Durée")
                                .font(.system(size: 15))
                                .foregroundStyle(Theme.mutedForeground)
                            Spacer()
                            Picker("Durée", selection: $duration) {
                                ForEach([12, 24, 36, 48, 60], id: \.self) {
                                    Text("\($0) mois").tag($0)
                                }
                            }
                            .tint(Theme.primary)
                        }
                        .padding(.horizontal, 16)
                        .frame(height: 54)
                        .background(
                            RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                .fill(Theme.surface)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                .strokeBorder(Theme.border, lineWidth: 1)
                        )
                    }

                    PrimaryButton(
                        title: "Créer la demande",
                        systemImage: "checkmark",
                        isLoading: isSaving,
                        isEnabled: canSubmit
                    ) {
                        Task { await save() }
                    }
                    .padding(.top, 4)
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Nouvelle demande")
            .navigationBarTitleDisplayMode(.inline)
            .scrollDismissesKeyboard(.interactively)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Annuler") { dismiss() }
                }
            }
        }
    }

    private func save() async {
        isSaving = true
        error = nil
        defer { isSaving = false }

        guard let companyId = await Session.shared.resolve() else {
            error = "Société introuvable pour votre compte."
            return
        }

        let payload = NewOffer(
            companyId: companyId,
            clientName: clientName.trimmingCharacters(in: .whitespaces),
            clientEmail: clientEmail.isEmpty ? nil : clientEmail,
            equipmentDescription: equipment.isEmpty ? nil : equipment,
            amount: Self.number(amount),
            monthlyPayment: Self.number(monthly),
            duration: duration
        )

        do {
            try await Backend.client.from("offers").insert(payload).execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            onCreated()
            dismiss()
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            self.error = "Création impossible. Vérifiez votre connexion."
        }
    }

    /// Accepte la virgule décimale : sur un clavier français, c'est ce que
    /// l'utilisateur tape naturellement.
    private static func number(_ raw: String) -> Double {
        Double(raw.replacingOccurrences(of: ",", with: ".")) ?? 0
    }
}

// MARK: - Composants de formulaire

struct FormSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title.uppercased())
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Theme.mutedForeground)
                .tracking(0.6)
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct LeazrTextArea: View {
    let placeholder: String
    @Binding var text: String
    @FocusState private var isFocused: Bool

    var body: some View {
        ZStack(alignment: .topLeading) {
            if text.isEmpty {
                Text(placeholder)
                    .font(.system(size: 17))
                    .foregroundStyle(Theme.mutedForeground.opacity(0.7))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 16)
                    .allowsHitTesting(false)
            }

            TextEditor(text: $text)
                .focused($isFocused)
                .font(.system(size: 17))
                .foregroundStyle(Theme.foreground)
                .scrollContentBackground(.hidden)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
        }
        .frame(height: 110)
        .background(
            RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                .fill(Theme.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                .strokeBorder(isFocused ? Theme.primary : Theme.border, lineWidth: isFocused ? 1.6 : 1)
        )
        .animation(.easeOut(duration: 0.18), value: isFocused)
    }
}
