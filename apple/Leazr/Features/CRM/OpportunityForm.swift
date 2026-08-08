import Foundation
import SwiftUI
import Supabase

/// Création et modification d'une affaire, reprise de `OpportunityDialog.tsx`.
///
/// Les mêmes champs dans le même ordre : intitulé, client, étape, source,
/// mensualité, clôture espérée, prochaine action, contexte.
struct OpportunityFormSheet: View {

    @Environment(\.dismiss) private var dismiss

    let stages: [PipelineStage]
    var existing: Opportunity?
    let onSaved: () async -> Void

    @State private var name = ""
    @State private var client: Client?
    @State private var stageId: String?
    @State private var source: String?
    @State private var monthly = ""
    @State private var hasCloseDate = false
    @State private var closeDate = Date()
    @State private var hasNextAction = false
    @State private var nextActionAt = Date()
    @State private var nextActionChannel = "call"
    @State private var nextActionNote = ""
    @State private var description = ""

    @State private var isPickingClient = false
    @State private var isWorking = false
    @State private var errorMessage: String?

    private var isEdit: Bool { existing != nil }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage {
                        ErrorBanner(message: errorMessage)
                    }

                    FormSection(title: "Intitulé") {
                        LeazrField(
                            icon: "text.alignleft",
                            placeholder: "Ex. Renouvellement parc portables — Dupont SRL",
                            text: $name,
                            autocapitalization: .sentences
                        )
                    }

                    FormSection(title: "Client") {
                        Button {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            isPickingClient = true
                        } label: {
                            HStack(spacing: 12) {
                                Image(systemName: "building.2.fill")
                                    .font(.system(size: 16))
                                    .foregroundStyle(client == nil ? Theme.mutedForeground : Theme.primary)
                                Text(client?.company ?? client?.name
                                    ?? existing?.client?.company ?? existing?.client?.name
                                    ?? "Choisir un client")
                                    .font(.system(size: 15))
                                    .foregroundStyle(client == nil && existing?.client == nil
                                        ? Theme.mutedForeground : Theme.foreground)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(Theme.mutedForeground)
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
                        .buttonStyle(PressableStyle())
                    }

                    FormSection(title: "Étape") {
                        VStack(spacing: 8) {
                            ForEach(stages) { stage in
                                StageChoiceRow(
                                    stage: stage,
                                    isCurrent: false,
                                    isSelected: stageId == stage.id
                                ) { stageId = stage.id }
                            }
                        }
                    }

                    FormSection(title: "Source") {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: 8)], spacing: 8) {
                            ForEach(CRMVocabulary.sources, id: \.code) { option in
                                SelectChip(label: option.label, isSelected: source == option.code) {
                                    source = option.code
                                }
                            }
                        }
                    }

                    FormSection(title: "Mensualité estimée (€)") {
                        LeazrField(
                            icon: "eurosign.circle",
                            placeholder: "0",
                            text: $monthly,
                            keyboardType: .decimalPad
                        )
                    }

                    FormSection(title: "Clôture espérée") {
                        VStack(spacing: 10) {
                            Toggle("Fixer une date", isOn: $hasCloseDate)
                                .tint(Theme.primary)
                                .font(.system(size: 15))
                                .padding(.horizontal, 16)
                                .frame(height: 50)
                                .background(
                                    RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                        .fill(Theme.surface)
                                )

                            if hasCloseDate {
                                DatePicker("", selection: $closeDate, displayedComponents: .date)
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

                    FormSection(title: "Prochaine action") {
                        VStack(spacing: 10) {
                            Toggle("Planifier un suivi", isOn: $hasNextAction)
                                .tint(Theme.primary)
                                .font(.system(size: 15))
                                .padding(.horizontal, 16)
                                .frame(height: 50)
                                .background(
                                    RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                        .fill(Theme.surface)
                                )

                            if hasNextAction {
                                DatePicker("", selection: $nextActionAt)
                                    .datePickerStyle(.compact)
                                    .labelsHidden()
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(.horizontal, 16)
                                    .frame(height: 54)
                                    .background(
                                        RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                            .fill(Theme.surface)
                                    )

                                LazyVGrid(columns: [GridItem(.adaptive(minimum: 110), spacing: 8)], spacing: 8) {
                                    ForEach(CRMVocabulary.channels, id: \.code) { option in
                                        SelectChip(
                                            label: option.label,
                                            isSelected: nextActionChannel == option.code
                                        ) { nextActionChannel = option.code }
                                    }
                                }

                                LeazrTextArea(
                                    placeholder: "Ex. relancer sur le devis",
                                    text: $nextActionNote
                                )
                            }
                        }
                    }

                    FormSection(title: "Contexte") {
                        LeazrTextArea(
                            placeholder: "Besoin identifié, interlocuteurs, historique…",
                            text: $description
                        )
                    }

                    PrimaryButton(
                        title: isEdit ? "Enregistrer" : "Créer l'affaire",
                        systemImage: isEdit ? "checkmark.circle.fill" : "plus.circle.fill",
                        isLoading: isWorking,
                        isEnabled: !name.trimmingCharacters(in: .whitespaces).isEmpty
                    ) {
                        Task { await save() }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle(isEdit ? "Modifier l'affaire" : "Nouvelle affaire")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Annuler") { dismiss() }
                }
            }
            .sheet(isPresented: $isPickingClient) {
                ClientPicker { client = $0 }
            }
            .onAppear(perform: prefill)
        }
    }

    private func prefill() {
        guard let existing, name.isEmpty else {
            // Création : on présélectionne l'étape par défaut du pipeline,
            // comme le fait `createOpportunity` côté serveur.
            if stageId == nil {
                stageId = (stages.first { $0.isDefault } ?? stages.first)?.id
            }
            return
        }

        name = existing.name
        stageId = existing.stageId
        source = existing.source
        description = existing.description ?? ""
        if let monthlyValue = existing.estimatedMonthlyPayment {
            monthly = String(format: "%.2f", monthlyValue)
        }
        if let close = existing.expectedCloseDate {
            hasCloseDate = true
            closeDate = close
        }
        if let next = existing.nextActionAt {
            hasNextAction = true
            nextActionAt = next
            nextActionChannel = existing.nextActionChannel ?? "call"
            nextActionNote = existing.nextActionNote ?? ""
        }
    }

    private func save() async {
        isWorking = true
        defer { isWorking = false }
        errorMessage = nil

        guard let companyId = await Session.shared.resolve() else {
            errorMessage = "Société introuvable."
            return
        }

        let monthlyValue = Double(monthly.replacingOccurrences(of: ",", with: "."))
        let resolvedClientId = client?.id ?? existing?.clientId

        var payload: [String: AnyJSON] = [
            "name": .string(name.trimmingCharacters(in: .whitespaces)),
            "client_id": resolvedClientId.map(AnyJSON.string) ?? .null,
            "stage_id": stageId.map(AnyJSON.string) ?? .null,
            "source": source.map(AnyJSON.string) ?? .null,
            "estimated_monthly_payment": monthlyValue.map { AnyJSON.double($0) } ?? .null,
            "description": description.isEmpty ? .null : .string(description),
            "expected_close_date": hasCloseDate
                ? .string(Self.dayFormatter.string(from: closeDate))
                : .null,
            "next_action_at": hasNextAction
                ? .string(ISO8601DateFormatter.leazrTimestamp.string(from: nextActionAt))
                : .null,
            "next_action_channel": hasNextAction ? .string(nextActionChannel) : .null,
            "next_action_note": hasNextAction && !nextActionNote.isEmpty
                ? .string(nextActionNote)
                : .null,
        ]

        do {
            if let existing {
                try await Backend.client
                    .from("opportunities")
                    .update(payload)
                    .eq("id", value: existing.id)
                    .execute()
            } else {
                // `company_id` et `created_from` ne sont posés qu'à la création :
                // les modifier ensuite n'aurait aucun sens.
                payload["company_id"] = .string(companyId)
                payload["created_from"] = .string("manual")
                payload["created_by"] = Session.shared.userId.map(AnyJSON.string) ?? .null
                try await Backend.client
                    .from("opportunities")
                    .insert(payload)
                    .execute()
            }

            UINotificationFeedbackGenerator().notificationOccurred(.success)
            await onSaved()
            dismiss()
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            errorMessage = isEdit ? "Enregistrement impossible." : "Création impossible."
        }
    }

    /// `expected_close_date` est une date nue en base, pas un horodatage.
    private static let dayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()
}
