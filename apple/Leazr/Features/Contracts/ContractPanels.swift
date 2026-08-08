import Foundation
import SwiftUI
import Supabase

// MARK: - Workflow

/// Progression du contrat, avec les deux actions du web : revenir à l'étape
/// précédente, ou passer à la suivante.
struct ContractWorkflowPanel: View {

    let contract: ContractDetail
    let onSelect: (ContractWorkflow.Step) -> Void

    private var currentIndex: Int { ContractWorkflow.currentIndex(for: contract) }
    private var steps: [ContractWorkflow.Step] { ContractWorkflow.steps }

    private var previousStep: ContractWorkflow.Step? {
        currentIndex > 0 ? steps[currentIndex - 1] : nil
    }

    private var nextStep: ContractWorkflow.Step? {
        currentIndex + 1 < steps.count ? steps[currentIndex + 1] : nil
    }

    /// On ne déclare pas une livraison sans numéro de suivi : c'est la règle
    /// du web, et elle évite des contrats « livrés » intraçables.
    private var isNextBlocked: Bool {
        nextStep?.id == "delivered" && (contract.trackingNumber ?? "").isEmpty
    }

    var body: some View {
        VStack(spacing: 12) {
            Card {
                VStack(alignment: .leading, spacing: 0) {
                    HStack {
                        Text("Cycle de vie du contrat")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Theme.foreground)
                        Spacer()
                        Text("\(currentIndex + 1)/\(steps.count)")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Theme.mutedForeground)
                    }
                    .padding(.bottom, 14)

                    ForEach(Array(steps.enumerated()), id: \.element.id) { index, step in
                        let isDone = index < currentIndex
                        let isCurrent = index == currentIndex
                        let tint: Color = isDone
                            ? Theme.emerald
                            : (isCurrent ? ContractWorkflow.tint(step.id) : Theme.border)

                        HStack(alignment: .top, spacing: 12) {
                            VStack(spacing: 0) {
                                ZStack {
                                    Circle().fill(tint.opacity(0.18)).frame(width: 26, height: 26)
                                    Image(systemName: isDone ? "checkmark" : step.icon)
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundStyle(tint)
                                }
                                if index < steps.count - 1 {
                                    Rectangle()
                                        .fill(index < currentIndex ? Theme.emerald : Theme.border)
                                        .frame(width: 2)
                                        .frame(minHeight: 22)
                                }
                            }

                            VStack(alignment: .leading, spacing: 2) {
                                Text(step.label)
                                    .font(.system(size: 15, weight: isCurrent ? .semibold : .regular))
                                    .foregroundStyle(index <= currentIndex ? Theme.foreground : Theme.mutedForeground)
                                Text(step.detail)
                                    .font(.system(size: 12))
                                    .foregroundStyle(Theme.mutedForeground)
                            }
                            .padding(.bottom, index < steps.count - 1 ? 12 : 0)

                            Spacer(minLength: 0)
                        }
                    }
                }
            }

            if let nextStep, !isNextBlocked {
                PrimaryButton(title: "Passer à « \(nextStep.label) »", systemImage: nextStep.icon) {
                    onSelect(nextStep)
                }
            }

            if isNextBlocked {
                Text("Ajoutez un numéro de suivi avant de déclarer la livraison.")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.amber)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            if let previousStep {
                TertiaryButton(title: "Revenir à « \(previousStep.label) »", systemImage: "arrow.uturn.backward") {
                    onSelect(previousStep)
                }
            }
        }
    }
}

struct ContractStatusChangeSheet: View {

    @Environment(\.dismiss) private var dismiss

    let step: ContractWorkflow.Step
    let current: String
    let onConfirm: (String?) async -> Bool

    @State private var reason = ""
    @State private var isWorking = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    Card {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(step.label)
                                .font(.system(size: 17, weight: .bold))
                                .foregroundStyle(ContractWorkflow.tint(step.id))
                            Text(step.detail)
                                .font(.system(size: 14))
                                .foregroundStyle(Theme.mutedForeground)
                            Text("Depuis « \(ContractWorkflow.label(current)) »")
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }

                    FormSection(title: "Motif (optionnel)") {
                        LeazrTextArea(placeholder: "Ce qui justifie ce changement", text: $reason)
                    }

                    PrimaryButton(
                        title: "Confirmer",
                        systemImage: "checkmark.circle.fill",
                        isLoading: isWorking
                    ) {
                        Task {
                            isWorking = true
                            let ok = await onConfirm(reason.isEmpty ? nil : reason)
                            isWorking = false
                            if ok { dismiss() }
                        }
                    }
                }
                .padding(20)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Changer d'étape")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
        }
    }
}

// MARK: - Signature

/// Progression de la mise en place : envoi, mandat SEPA, signature, contrat
/// généré. Repris de `SignatureProgressTimeline`.
struct SignatureProgressTimeline: View {

    let contract: ContractDetail

    private struct Step {
        let label: String
        let icon: String
        let done: Bool
    }

    private var steps: [Step] {
        let index = ContractWorkflow.currentIndex(for: contract)
        return [
            Step(label: "Contrat envoyé", icon: "paperplane.fill", done: index >= 0),
            Step(label: "Mandat SEPA", icon: "creditcard.fill", done: contract.hasMandate),
            Step(label: "Signé par le client", icon: "signature", done: index >= 1),
            Step(label: "Contrat actif", icon: "play.circle.fill", done: index >= 4),
        ]
    }

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                Text("Mise en place")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Theme.foreground)

                HStack(spacing: 0) {
                    ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                        VStack(spacing: 6) {
                            ZStack {
                                Circle()
                                    .fill(step.done ? Theme.emerald : Theme.border.opacity(0.6))
                                    .frame(width: 30, height: 30)
                                Image(systemName: step.done ? "checkmark" : step.icon)
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundStyle(step.done ? .white : Theme.mutedForeground)
                            }
                            Text(step.label)
                                .font(.system(size: 10, weight: .medium))
                                .foregroundStyle(step.done ? Theme.foreground : Theme.mutedForeground)
                                .multilineTextAlignment(.center)
                                .lineLimit(2)
                        }
                        .frame(maxWidth: .infinity)

                        if index < steps.count - 1 {
                            Rectangle()
                                .fill(steps[index + 1].done ? Theme.emerald : Theme.border)
                                .frame(height: 2)
                                .offset(y: -13)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Dates

struct ContractDatesCard: View {

    let contract: ContractDetail
    let rule: ContractStartRule

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 10) {
                Text("Dates")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Theme.foreground)

                VStack(spacing: 0) {
                    DetailRow(label: "Dossier", value: Format.date(contract.dossierDate))
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Livraison", value: Format.date(contract.deliveryDate))
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Début", value: Format.date(contract.contractStartDate))
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Fin", value: Format.date(contract.contractEndDate))
                    if contract.invoiceDate != nil {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Facturation", value: Format.date(contract.invoiceDate))
                    }
                    if contract.paymentDate != nil {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Paiement", value: Format.date(contract.paymentDate))
                    }
                }

                // La règle appartient au bailleur : l'afficher explique
                // pourquoi la date de début n'est pas celle de la livraison.
                Text("Démarrage : \(rule.label)")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.mutedForeground)
            }
        }
    }
}

struct ContractDatesSheet: View {

    @Environment(\.dismiss) private var dismiss

    let contract: ContractDetail
    let rule: ContractStartRule
    let onSaved: () async -> Void

    @State private var delivery = Date()
    @State private var hasDelivery = false
    @State private var start = Date()
    @State private var hasStart = false
    @State private var end = Date()
    @State private var hasEnd = false
    @State private var duration = 36
    @State private var isSaving = false
    @State private var errorMessage: String?

    /// Date de début déduite de la livraison par la règle du bailleur.
    private var computedStart: Date? {
        hasDelivery ? rule.startDate(from: delivery) : nil
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage {
                        ErrorBanner(message: errorMessage)
                    }

                    dateField(title: "Date de livraison", isOn: $hasDelivery, date: $delivery)

                    if let computedStart {
                        Text("Selon la règle du bailleur (\(rule.label)), le contrat démarrerait le \(Format.date(computedStart)).")
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.primary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    dateField(title: "Début du contrat", isOn: $hasStart, date: $start)
                    dateField(title: "Fin du contrat", isOn: $hasEnd, date: $end)

                    FormSection(title: "Durée (mois)") {
                        Stepper("\(duration) mois", value: $duration, in: 1...120)
                            .padding(.horizontal, 16)
                            .frame(height: 50)
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
            .navigationTitle("Dates du contrat")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .onAppear(perform: prefill)
        }
    }

    private func dateField(title: String, isOn: Binding<Bool>, date: Binding<Date>) -> some View {
        FormSection(title: title) {
            VStack(spacing: 10) {
                Toggle("Renseignée", isOn: isOn)
                    .tint(Theme.primary)
                    .font(.system(size: 15))
                    .padding(.horizontal, 16)
                    .frame(height: 50)
                    .background(
                        RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                            .fill(Theme.surface)
                    )
                if isOn.wrappedValue {
                    DatePicker("", selection: date, displayedComponents: .date)
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
    }

    private func prefill() {
        if let value = contract.deliveryDate { delivery = value; hasDelivery = true }
        if let value = contract.contractStartDate { start = value; hasStart = true }
        if let value = contract.contractEndDate { end = value; hasEnd = true }
        duration = contract.duration
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        var payload: [String: AnyJSON] = [
            "contract_duration": .integer(duration),
        ]
        payload["delivery_date"] = hasDelivery ? .string(Format.day(delivery)) : .null
        payload["contract_end_date"] = hasEnd ? .string(Format.day(end)) : .null

        // Si aucune date de début n'est saisie, on applique la règle du
        // bailleur plutôt que de laisser le champ vide.
        if hasStart {
            payload["contract_start_date"] = .string(Format.day(start))
        } else if let computedStart {
            payload["contract_start_date"] = .string(Format.day(computedStart))
        } else {
            payload["contract_start_date"] = .null
        }

        if await ContractService.patch(contractId: contract.id, payload) {
            await onSaved()
            dismiss()
        } else {
            errorMessage = "Enregistrement impossible."
        }
    }
}

// MARK: - Suivi de livraison

struct TrackingSheet: View {

    @Environment(\.dismiss) private var dismiss

    let contract: ContractDetail
    let onSaved: () async -> Void

    @State private var number = ""
    @State private var carrier = ""
    @State private var hasEstimate = false
    @State private var estimate = Date()
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage {
                        ErrorBanner(message: errorMessage)
                    }

                    FormSection(title: "Numéro de suivi") {
                        LeazrField(
                            icon: "shippingbox",
                            placeholder: "Ex. 1Z999AA10123456784",
                            text: $number,
                            autocapitalization: .characters
                        )
                    }

                    FormSection(title: "Transporteur") {
                        LeazrField(
                            icon: "truck.box",
                            placeholder: "Ex. DPD, UPS, Bpost",
                            text: $carrier,
                            autocapitalization: .words
                        )
                    }

                    FormSection(title: "Livraison estimée") {
                        VStack(spacing: 10) {
                            Toggle("Renseignée", isOn: $hasEstimate)
                                .tint(Theme.primary)
                                .font(.system(size: 15))
                                .padding(.horizontal, 16)
                                .frame(height: 50)
                                .background(
                                    RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                        .fill(Theme.surface)
                                )
                            if hasEstimate {
                                DatePicker("", selection: $estimate, displayedComponents: .date)
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
                        title: "Enregistrer le suivi",
                        systemImage: "checkmark.circle.fill",
                        isLoading: isSaving,
                        isEnabled: !number.trimmingCharacters(in: .whitespaces).isEmpty
                    ) {
                        Task { await save() }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Suivi de livraison")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .onAppear {
                number = contract.trackingNumber ?? ""
                carrier = contract.deliveryCarrier ?? ""
                if let value = contract.estimatedDelivery { estimate = value; hasEstimate = true }
            }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        let ok = await ContractService.setTracking(
            contractId: contract.id,
            number: number.trimmingCharacters(in: .whitespaces),
            carrier: carrier.isEmpty ? nil : carrier,
            estimatedDelivery: hasEstimate ? estimate : nil
        )
        if ok {
            await onSaved()
            dismiss()
        } else {
            errorMessage = "Enregistrement impossible."
        }
    }
}

// MARK: - Référence et dispositions

struct ContractMetaSheet: View {

    @Environment(\.dismiss) private var dismiss

    let contract: ContractDetail
    let onSaved: () async -> Void

    @State private var number = ""
    @State private var provisions = ""
    @State private var isSelfLeasing = false
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage {
                        ErrorBanner(message: errorMessage)
                    }

                    FormSection(title: "Numéro de contrat") {
                        LeazrField(
                            icon: "number",
                            placeholder: "Référence du bailleur",
                            text: $number,
                            autocapitalization: .characters
                        )
                    }

                    FormSection(title: "Auto-leasing") {
                        Toggle("Contrat porté par la société", isOn: $isSelfLeasing)
                            .tint(Theme.primary)
                            .font(.system(size: 15))
                            .padding(.horizontal, 16)
                            .frame(height: 52)
                            .background(
                                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                    .fill(Theme.surface)
                            )
                    }

                    FormSection(title: "Dispositions particulières") {
                        LeazrTextArea(
                            placeholder: "Clauses négociées, engagements spécifiques…",
                            text: $provisions
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
            .navigationTitle("Référence")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .onAppear {
                number = contract.contractNumber ?? ""
                provisions = contract.specialProvisions ?? ""
                isSelfLeasing = contract.isSelfLeasing
            }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        let ok = await ContractService.patch(contractId: contract.id, [
            "contract_number": number.isEmpty ? .null : .string(number),
            "special_provisions": provisions.isEmpty ? .null : .string(provisions),
            "is_self_leasing": .bool(isSelfLeasing),
        ])
        if ok {
            await onSaved()
            dismiss()
        } else {
            errorMessage = "Enregistrement impossible."
        }
    }
}

// MARK: - Résiliation

/// Clôture anticipée et réactivation, calquées sur `ContractTerminationToggle`.
struct ContractTerminationCard: View {

    let contract: ContractDetail
    let onChanged: () async -> Void

    @State private var isTerminating = false
    @State private var reason = ""
    @State private var isWorking = false

    private var canTerminate: Bool {
        contract.status == "active" || contract.status == "extended"
    }

    private var canReactivate: Bool { contract.status == "completed" }

    var body: some View {
        if canTerminate || canReactivate {
            Card {
                VStack(alignment: .leading, spacing: 10) {
                    Text(canTerminate ? "Clôturer le contrat" : "Réactiver le contrat")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Theme.foreground)

                    Text(canTerminate
                        ? "Le contrat passera en « Terminé ». Le matériel reste attribué tant qu'il n'est pas repris."
                        : "Le contrat repassera en « Actif ».")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.mutedForeground)

                    if canTerminate {
                        ActionButton(title: "Clôturer", icon: "flag.checkered", tint: Theme.destructive) {
                            isTerminating = true
                        }
                    } else {
                        ActionButton(title: "Réactiver", icon: "arrow.clockwise", tint: Theme.emerald) {
                            Task { await apply(to: "active", reason: "Contrat réactivé") }
                        }
                    }
                }
            }
            .sheet(isPresented: $isTerminating) {
                NavigationStack {
                    ScrollView {
                        VStack(spacing: 18) {
                            FormSection(title: "Motif de la clôture") {
                                LeazrTextArea(
                                    placeholder: "Fin de durée, résiliation anticipée, rachat…",
                                    text: $reason
                                )
                            }

                            PrimaryButton(
                                title: "Clôturer le contrat",
                                systemImage: "flag.checkered",
                                isLoading: isWorking
                            ) {
                                Task {
                                    await apply(to: "completed", reason: reason.isEmpty ? "Contrat clôturé" : reason)
                                    isTerminating = false
                                }
                            }
                        }
                        .padding(20)
                    }
                    .background(Theme.background.ignoresSafeArea())
                    .navigationTitle("Clôturer")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .topBarLeading) {
                            Button("Annuler") { isTerminating = false }
                        }
                    }
                }
                .presentationDetents([.height(380)])
            }
        }
    }

    private func apply(to status: String, reason: String) async {
        isWorking = true
        defer { isWorking = false }
        let ok = await ContractService.updateStatus(
            contractId: contract.id,
            to: status,
            from: contract.status,
            reason: reason
        )
        if ok { await onChanged() }
    }
}

// MARK: - Relance

struct ContractFollowUpSheet: View {

    @Environment(\.dismiss) private var dismiss
    let contract: ContractDetail

    @State private var recipient = ""
    @State private var subject = ""
    @State private var message = ""
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
                            placeholder: "Objet",
                            text: $subject,
                            autocapitalization: .sentences
                        )
                    }

                    FormSection(title: "Message") {
                        LeazrTextArea(placeholder: "Votre message", text: $message)
                    }

                    PrimaryButton(
                        title: "Envoyer",
                        systemImage: "paperplane.fill",
                        isLoading: isSending,
                        isEnabled: recipient.contains("@") && !subject.isEmpty
                    ) {
                        Task { await send() }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Suivi client")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .onAppear {
                recipient = contract.clientEmail ?? ""
                subject = "Votre contrat \(contract.contractNumber ?? "") — suivi"
                message = """
                Bonjour,

                Nous revenons vers vous au sujet de votre contrat de \(Format.currency(contract.monthlyPayment)) par mois sur \(contract.duration) mois.

                Bien à vous,
                """
            }
        }
    }

    private func send() async {
        isSending = true
        defer { isSending = false }
        do {
            // Le corps est transmis en HTML : les sauts de ligne saisis
            // doivent devenir des balises, sinon l'e-mail arrive en un bloc.
            let html = message
                .replacingOccurrences(of: "\n", with: "<br/>")
            try await ContractService.sendFollowUp(
                contractId: contract.id,
                to: recipient.trimmingCharacters(in: .whitespaces),
                subject: subject,
                html: "<div style=\"font-family:Arial,sans-serif;font-size:14px\">\(html)</div>"
            )
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            dismiss()
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "Envoi impossible."
        }
    }
}
