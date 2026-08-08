import Foundation
import SwiftUI
import Supabase

// MARK: - Période et tri

/// Plage de dates sur la date de facture, et raccourcis d'année.
struct InvoicePeriodSheet: View {

    @Environment(\.dismiss) private var dismiss
    @Bindable var store: InvoicingStore

    @State private var hasFrom = false
    @State private var from = Date()
    @State private var hasTo = false
    @State private var to = Date()

    private var years: [Int] {
        let current = Calendar.current.component(.year, from: Date())
        return [current, current - 1, current - 2]
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    FormSection(title: "Exercice") {
                        HStack(spacing: 8) {
                            ForEach(years, id: \.self) { year in
                                SelectChip(label: String(year), isSelected: false) {
                                    selectYear(year)
                                }
                            }
                        }
                    }

                    FormSection(title: "À partir du") {
                        VStack(spacing: 10) {
                            Toggle("Renseignée", isOn: $hasFrom)
                                .tint(Theme.primary)
                                .font(.system(size: 15))
                                .padding(.horizontal, 16)
                                .frame(height: 50)
                                .background(
                                    RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                        .fill(Theme.surface)
                                )
                            if hasFrom {
                                DatePicker("", selection: $from, displayedComponents: .date)
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

                    FormSection(title: "Jusqu'au") {
                        VStack(spacing: 10) {
                            Toggle("Renseignée", isOn: $hasTo)
                                .tint(Theme.primary)
                                .font(.system(size: 15))
                                .padding(.horizontal, 16)
                                .frame(height: 50)
                                .background(
                                    RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                        .fill(Theme.surface)
                                )
                            if hasTo {
                                DatePicker("", selection: $to, displayedComponents: .date)
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

                    TertiaryButton(title: "Tout réinitialiser", systemImage: "arrow.counterclockwise") {
                        store.resetFilters()
                        hasFrom = false
                        hasTo = false
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Période")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Terminé") { apply(); dismiss() }.fontWeight(.semibold)
                }
            }
            .onAppear {
                if let value = store.dateFrom { from = value; hasFrom = true }
                if let value = store.dateTo { to = value; hasTo = true }
            }
        }
    }

    /// Un exercice se sélectionne d'un geste : c'est la découpe qu'on utilise
    /// neuf fois sur dix en comptabilité.
    private func selectYear(_ year: Int) {
        let calendar = Calendar.current
        from = calendar.date(from: DateComponents(year: year, month: 1, day: 1)) ?? Date()
        to = calendar.date(from: DateComponents(year: year, month: 12, day: 31)) ?? Date()
        hasFrom = true
        hasTo = true
    }

    private func apply() {
        store.dateFrom = hasFrom ? from : nil
        store.dateTo = hasTo ? to : nil
    }
}

// MARK: - Billit

/// Synchronisation et imports Billit. Toute la logique vit dans les edge
/// functions ; l'app choisit la date de départ et déclenche.
struct BillitSheet: View {

    @Environment(\.dismiss) private var dismiss

    let companyId: String?
    let onDone: () async -> Void

    @State private var hasFromDate = true
    @State private var fromDate = Calendar.current.date(byAdding: .month, value: -3, to: Date()) ?? Date()
    @State private var isWorking = false
    @State private var message: String?
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage { ErrorBanner(message: errorMessage) }
                    if let message { InfoBanner(message: message) }

                    FormSection(title: "Importer depuis le") {
                        VStack(spacing: 10) {
                            Toggle("Limiter la période", isOn: $hasFromDate)
                                .tint(Theme.primary)
                                .font(.system(size: 15))
                                .padding(.horizontal, 16)
                                .frame(height: 50)
                                .background(
                                    RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                        .fill(Theme.surface)
                                )
                            if hasFromDate {
                                DatePicker("", selection: $fromDate, displayedComponents: .date)
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

                    SectionHeader(title: "Actions")

                    ActionRow(
                        icon: "arrow.triangle.2.circlepath",
                        tint: Theme.emerald,
                        title: "Synchroniser les statuts",
                        subtitle: "Relit l'état de paiement chez Billit",
                        isBusy: isWorking
                    ) { Task { await run { await InvoiceService.syncBillitStatuses(companyId: $0) } } }

                    ActionRow(
                        icon: "square.and.arrow.down.fill",
                        tint: Theme.sky,
                        title: "Importer les factures de vente",
                        subtitle: "Crée les factures absentes",
                        isBusy: isWorking
                    ) {
                        Task {
                            await run {
                                await InvoiceService.importBillitSales(companyId: $0, from: hasFromDate ? fromDate : nil)
                            }
                        }
                    }

                    ActionRow(
                        icon: "arrow.uturn.backward.circle.fill",
                        tint: Theme.violet,
                        title: "Importer les notes de crédit",
                        subtitle: "Avoirs émis sur la période",
                        isBusy: isWorking
                    ) {
                        Task {
                            await run {
                                await InvoiceService.importBillitCreditNotes(companyId: $0, from: hasFromDate ? fromDate : nil)
                            }
                        }
                    }

                    ActionRow(
                        icon: "tray.and.arrow.down.fill",
                        tint: Theme.amber,
                        title: "Importer les factures d'achat",
                        subtitle: "Factures fournisseurs, extraction serveur",
                        isBusy: isWorking
                    ) {
                        Task {
                            await run {
                                await InvoiceService.importBillitPurchases(companyId: $0, from: hasFromDate ? fromDate : nil)
                            }
                        }
                    }

                    Text("Le rapprochement d'une facture importée avec un contrat se fait depuis le web : il demande de comparer des lignes côte à côte.")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Billit")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Fermer") { dismiss() } }
            }
        }
    }

    private func run(_ operation: (String) async -> InvoiceService.BillitOutcome) async {
        guard let companyId else {
            errorMessage = "Société introuvable."
            return
        }
        isWorking = true
        defer { isWorking = false }
        errorMessage = nil
        message = nil

        let outcome = await operation(companyId)
        if outcome.success {
            message = outcome.detail.isEmpty ? "Opération terminée." : outcome.detail
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            await onDone()
        } else {
            errorMessage = outcome.detail
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
    }
}

// MARK: - Envoi au bailleur

/// Transmission de la facture et de ses pièces au bailleur, avec aperçu
/// avant envoi — c'est le garde-fou du web, on le garde.
struct LeaserDocumentsSheet: View {

    @Environment(\.dismiss) private var dismiss

    let invoice: InvoiceDetail
    let documents: [ContractDocument]

    @State private var leaserEmail = ""
    @State private var ccEmail = ""
    @State private var selected: Set<String> = []
    @State private var message = ""
    @State private var isWorking = false
    @State private var previewMessage: String?
    @State private var infoMessage: String?
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage { ErrorBanner(message: errorMessage) }
                    if let infoMessage { InfoBanner(message: infoMessage) }

                    Card {
                        VStack(spacing: 0) {
                            DetailRow(label: "Facture", value: invoice.invoiceNumber ?? "—")
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Bailleur", value: invoice.leaserName)
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Montant", value: Format.currency(invoice.amount), emphasis: true)
                        }
                    }

                    FormSection(title: "Adresse du bailleur") {
                        LeazrField(
                            icon: "envelope",
                            placeholder: "facturation@bailleur.be",
                            text: $leaserEmail,
                            textContentType: .emailAddress,
                            keyboardType: .emailAddress
                        )
                    }

                    FormSection(title: "En copie (optionnel)") {
                        LeazrField(
                            icon: "person.2",
                            placeholder: "adresse@exemple.be",
                            text: $ccEmail,
                            textContentType: .emailAddress,
                            keyboardType: .emailAddress
                        )
                    }

                    FormSection(title: "Pièces à joindre") {
                        if documents.isEmpty {
                            Text("Aucun document rattaché au contrat de cette facture.")
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.mutedForeground)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        } else {
                            VStack(spacing: 8) {
                                ForEach(documents) { document in
                                    CheckRow(
                                        label: "\(document.fileName)\(document.readableSize.isEmpty ? "" : " — \(document.readableSize)")",
                                        isChecked: selected.contains(document.id)
                                    ) {
                                        if selected.contains(document.id) {
                                            selected.remove(document.id)
                                        } else {
                                            selected.insert(document.id)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    FormSection(title: "Message (optionnel)") {
                        LeazrTextArea(placeholder: "Un mot au bailleur", text: $message)
                    }

                    if let previewMessage {
                        Card {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Aperçu")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(Theme.foreground)
                                Text(previewMessage)
                                    .font(.system(size: 12))
                                    .foregroundStyle(Theme.mutedForeground)
                            }
                        }
                    }

                    TertiaryButton(title: "Aperçu avant envoi", systemImage: "eye") {
                        Task { await send(previewOnly: true) }
                    }

                    PrimaryButton(
                        title: "Envoyer au bailleur",
                        systemImage: "paperplane.fill",
                        isLoading: isWorking,
                        isEnabled: leaserEmail.contains("@") && !selected.isEmpty
                    ) {
                        Task { await send(previewOnly: false) }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Envoyer au bailleur")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .onAppear {
                // Tout sélectionner par défaut : on envoie généralement le
                // dossier complet, pas une pièce isolée.
                selected = Set(documents.map(\.id))
            }
        }
    }

    private func send(previewOnly: Bool) async {
        isWorking = true
        defer { isWorking = false }
        errorMessage = nil
        infoMessage = nil

        let outcome = await InvoiceService.sendToLeaser(
            invoice: invoice,
            leaserEmail: leaserEmail.trimmingCharacters(in: .whitespaces),
            ccEmails: ccEmail.isEmpty ? [] : [ccEmail.trimmingCharacters(in: .whitespaces)],
            documentIds: Array(selected),
            message: message.isEmpty ? nil : message,
            previewOnly: previewOnly
        )

        if outcome.success {
            if previewOnly {
                previewMessage = outcome.detail.isEmpty
                    ? "L'envoi contiendra \(selected.count) pièce(s)."
                    : outcome.detail
            } else {
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                infoMessage = "Envoyé au bailleur."
                dismiss()
            }
        } else {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            errorMessage = outcome.detail
        }
    }
}
