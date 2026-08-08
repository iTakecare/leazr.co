import Foundation
import Observation
import SwiftUI
import Supabase

/// Fiche d'une facture : parties, lignes, échéances et actions.
struct InvoiceDetailScreen: View {

    let invoiceId: String
    let onChanged: () async -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var invoice: InvoiceDetail?
    @State private var documents: [ContractDocument] = []
    @State private var isLoading = false
    @State private var isEditing = false
    @State private var isCrediting = false
    @State private var isSendingToLeaser = false
    @State private var isMarkingPaid = false
    @State private var paidDate = Date()
    @State private var isDeleting = false
    @State private var message: String?
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let errorMessage { ErrorBanner(message: errorMessage) }
                if let message { InfoBanner(message: message) }

                if let invoice {
                    HighlightCard(
                        label: InvoiceVocabulary.label(invoice.status),
                        value: Format.currency(invoice.amount),
                        tint: InvoiceVocabulary.tint(invoice.status)
                    )

                    if invoice.creditedAmount > 0 {
                        Card {
                            HStack(spacing: 8) {
                                Image(systemName: "arrow.uturn.backward.circle.fill")
                                    .font(.system(size: 15))
                                    .foregroundStyle(Theme.violet)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Créditée de \(Format.currency(invoice.creditedAmount))")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(Theme.foreground)
                                    Text("Reste \(Format.currency(invoice.netAmount))")
                                        .font(.system(size: 12))
                                        .foregroundStyle(Theme.mutedForeground)
                                }
                                Spacer()
                            }
                        }
                    }

                    identityCard(invoice)
                    partiesCard(invoice)
                    linesCard(invoice)
                    actions(invoice)
                } else if isLoading {
                    ProgressView().tint(Theme.mutedForeground).padding(.top, 40)
                } else {
                    EmptyHint(icon: "doc.text", label: "Facture introuvable")
                }
            }
            .padding(20)
            .frame(maxWidth: 700)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle(invoice?.invoiceNumber ?? "Facture")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $isEditing) {
            if let invoice {
                EditInvoiceSheet(invoice: invoice) { await reload() }
            }
        }
        .sheet(isPresented: $isCrediting) {
            if let invoice {
                CreditNoteSheet(invoice: invoice) { await reload() }
            }
        }
        .sheet(isPresented: $isSendingToLeaser) {
            if let invoice {
                LeaserDocumentsSheet(invoice: invoice, documents: documents)
            }
        }
        .alert("Marquer comme payée", isPresented: $isMarkingPaid) {
            Button("Annuler", role: .cancel) {}
            Button("Confirmer") {
                Task {
                    guard let invoice else { return }
                    if await InvoiceService.setStatus(invoiceId: invoice.id, to: "paid", paidAt: Date()) {
                        await reload()
                        message = "Facture marquée payée."
                    }
                }
            }
        } message: {
            Text("La date d'encaissement sera fixée à aujourd'hui. Elle détermine l'année de rattachement comptable.")
        }
        .alert("Supprimer cette facture ?", isPresented: $isDeleting) {
            Button("Annuler", role: .cancel) {}
            Button("Supprimer", role: .destructive) {
                Task {
                    guard let invoice else { return }
                    if await InvoiceService.delete(invoiceId: invoice.id) {
                        await onChanged()
                        dismiss()
                    }
                }
            }
        }
        .task { await reload() }
        .refreshable { await reload() }
    }

    // MARK: Cartes

    private func identityCard(_ invoice: InvoiceDetail) -> some View {
        Card {
            VStack(spacing: 0) {
                DetailRow(label: "Numéro", value: invoice.invoiceNumber ?? "—")
                Divider().overlay(Theme.border)
                DetailRow(label: "Type", value: InvoiceVocabulary.typeLabel(invoice.invoiceType))
                Divider().overlay(Theme.border)
                DetailRow(label: "Date de facture", value: Format.date(invoice.invoiceDate ?? invoice.createdAt))
                if let due = invoice.dueDate {
                    Divider().overlay(Theme.border)
                    HStack {
                        Text("Échéance")
                            .font(.system(size: 15))
                            .foregroundStyle(Theme.mutedForeground)
                        Spacer()
                        Text(Format.date(due))
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(invoice.isOverdue ? Theme.destructive : Theme.foreground)
                    }
                    .padding(.vertical, 12)
                }
                if let paid = invoice.paidAt {
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Payée le", value: Format.date(paid))
                }
                if let sent = invoice.sentAt {
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Envoyée le", value: Format.date(sent))
                }
                if let source = invoice.integrationType, source != "manual" {
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Source", value: source.capitalized)
                }
                if let external = invoice.externalInvoiceId {
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Référence externe", value: external)
                }
            }
        }
    }

    @ViewBuilder
    private func partiesCard(_ invoice: InvoiceDetail) -> some View {
        Card {
            VStack(alignment: .leading, spacing: 10) {
                Text("Parties")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Theme.foreground)

                VStack(spacing: 0) {
                    DetailRow(label: "Client", value: invoice.clientName)
                    if let vat = invoice.billing?.client?.vatNumber, !vat.isEmpty {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "N° d'entreprise", value: vat)
                    }
                    if let email = invoice.billing?.client?.email, !email.isEmpty {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "E-mail", value: email)
                    }
                    if let address = invoice.billing?.client?.fullAddress {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Adresse", value: address)
                    }
                    if !invoice.isPurchase {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Bailleur", value: invoice.leaserName)
                    }
                    if let dossier = invoice.billing?.offer?.dossierNumber {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "N° de dossier", value: dossier)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func linesCard(_ invoice: InvoiceDetail) -> some View {
        let lines = invoice.billing?.equipment ?? []
        if !lines.isEmpty {
            SectionHeader(title: "Lignes", count: lines.count)

            ForEach(lines) { line in
                Card {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(alignment: .top) {
                            Text(line.title ?? "Ligne")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(Theme.foreground)
                                .multilineTextAlignment(.leading)
                            Spacer(minLength: 8)
                            Text(Format.currency((line.sellingPrice ?? line.purchasePrice ?? 0)
                                * Double(line.quantity ?? 1)))
                                .font(.system(size: 15, weight: .bold))
                                .foregroundStyle(Theme.foreground)
                        }

                        HStack(spacing: 10) {
                            if let quantity = line.quantity, quantity > 1 {
                                Text("×\(quantity)")
                                    .font(.system(size: 12))
                                    .foregroundStyle(Theme.mutedForeground)
                            }
                            if let serial = line.serialNumber, !serial.isEmpty {
                                Text(serial)
                                    .font(.system(size: 12, design: .monospaced))
                                    .foregroundStyle(Theme.mutedForeground)
                            }
                            Spacer(minLength: 0)
                        }
                    }
                }
            }
        } else if let description = invoice.billing?.description, !description.isEmpty {
            Card {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Objet")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                    Text(description)
                        .font(.system(size: 14))
                        .foregroundStyle(Theme.mutedForeground)
                }
            }
        }
    }

    @ViewBuilder
    private func actions(_ invoice: InvoiceDetail) -> some View {
        VStack(spacing: 8) {
            SectionHeader(title: "Actions")

            if let url = invoice.pdfURL.flatMap(URL.init) {
                Link(destination: url) {
                    ActionRowLabel(
                        icon: "doc.richtext.fill",
                        tint: Theme.sky,
                        title: "Ouvrir le PDF",
                        subtitle: "Document généré par la facturation"
                    )
                }
            }

            if invoice.status != "paid", invoice.status != "credited" {
                ActionRow(
                    icon: "checkmark.circle.fill",
                    tint: Theme.emerald,
                    title: "Marquer comme payée",
                    subtitle: "Fixe la date d'encaissement"
                ) { isMarkingPaid = true }
            }

            if invoice.status == "draft" {
                ActionRow(
                    icon: "paperplane.fill",
                    tint: Theme.sky,
                    title: "Marquer comme envoyée",
                    subtitle: "Sans envoi automatique"
                ) {
                    Task {
                        if await InvoiceService.setStatus(invoiceId: invoice.id, to: "sent", paidAt: nil) {
                            await reload()
                        }
                    }
                }
            }

            if !invoice.isPurchase {
                ActionRow(
                    icon: "envelope.fill",
                    tint: Theme.violet,
                    title: "Envoyer au bailleur",
                    subtitle: documents.isEmpty
                        ? "Aucune pièce rattachée au contrat"
                        : "\(documents.count) pièce(s) disponible(s)"
                ) { isSendingToLeaser = true }
            }

            if invoice.creditedAmount < invoice.amount {
                ActionRow(
                    icon: "arrow.uturn.backward.circle.fill",
                    tint: Theme.violet,
                    title: "Créer une note de crédit",
                    subtitle: "Annule tout ou partie de la facture"
                ) { isCrediting = true }
            }

            ActionRow(
                icon: "square.and.pencil",
                tint: Theme.primary,
                title: "Modifier",
                subtitle: "Numéro, dates, montant"
            ) { isEditing = true }

            ActionRow(
                icon: "trash.fill",
                tint: Theme.destructive,
                title: "Supprimer la facture",
                subtitle: "Action définitive"
            ) { isDeleting = true }
        }
    }

    private func reload() async {
        isLoading = true
        defer { isLoading = false }
        invoice = await InvoiceService.invoice(id: invoiceId)
        documents = await InvoiceService.contractDocuments(contractId: invoice?.contractId)
        await onChanged()
    }
}

// MARK: - Création

struct NewInvoiceSheet: View {

    @Environment(\.dismiss) private var dismiss

    let companyId: String?
    let onCreated: () async -> Void

    @State private var type = "purchase"
    @State private var client: Client?
    @State private var clientName = ""
    @State private var amount = ""
    @State private var description = ""
    @State private var invoiceDate = Date()
    @State private var hasDueDate = false
    @State private var dueDate = Date().addingTimeInterval(30 * 86_400)
    @State private var isPickingClient = false
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage { ErrorBanner(message: errorMessage) }

                    FormSection(title: "Type de facture") {
                        HStack(spacing: 8) {
                            SelectChip(label: "Vente directe", isSelected: type == "purchase", tint: Theme.teal) {
                                type = "purchase"
                            }
                            SelectChip(label: "Leasing", isSelected: type == "leasing", tint: Theme.primary) {
                                type = "leasing"
                            }
                        }
                    }

                    FormSection(title: "Client") {
                        VStack(spacing: 10) {
                            Button {
                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                isPickingClient = true
                            } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: "building.2.fill")
                                        .font(.system(size: 16))
                                        .foregroundStyle(client == nil ? Theme.mutedForeground : Theme.primary)
                                    Text(client?.company ?? client?.name ?? "Choisir dans les clients")
                                        .font(.system(size: 15))
                                        .foregroundStyle(client == nil ? Theme.mutedForeground : Theme.foreground)
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

                            // Une facture peut viser un tiers qui n'est pas au
                            // fichier clients : la saisie libre reste possible.
                            LeazrField(
                                icon: "pencil",
                                placeholder: "ou saisir un nom",
                                text: $clientName,
                                autocapitalization: .words
                            )
                        }
                    }

                    FormSection(title: "Montant (€)") {
                        LeazrField(
                            icon: "eurosign.circle",
                            placeholder: "0",
                            text: $amount,
                            keyboardType: .decimalPad
                        )
                    }

                    FormSection(title: "Objet") {
                        LeazrTextArea(placeholder: "Prestation facturée", text: $description)
                    }

                    FormSection(title: "Date de facture") {
                        DatePicker("", selection: $invoiceDate, displayedComponents: .date)
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
                                DatePicker("", selection: $dueDate, displayedComponents: .date)
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
                        title: "Créer la facture",
                        systemImage: "plus.circle.fill",
                        isLoading: isSaving,
                        isEnabled: resolvedName.isEmpty == false
                            && Double(amount.replacingOccurrences(of: ",", with: ".")) != nil
                    ) {
                        Task { await save() }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Nouvelle facture")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .sheet(isPresented: $isPickingClient) {
                ClientPicker { selected in
                    client = selected
                    clientName = ""
                }
            }
        }
    }

    private var resolvedName: String {
        let manual = clientName.trimmingCharacters(in: .whitespaces)
        if !manual.isEmpty { return manual }
        return client?.company ?? client?.name ?? ""
    }

    private func save() async {
        guard let companyId,
              let value = Double(amount.replacingOccurrences(of: ",", with: "."))
        else {
            errorMessage = "Société introuvable."
            return
        }

        isSaving = true
        defer { isSaving = false }

        let created = await InvoiceService.create(companyId: companyId, .init(
            type: type,
            clientName: resolvedName,
            clientId: client?.id,
            amount: value,
            description: description.trimmingCharacters(in: .whitespacesAndNewlines),
            invoiceDate: invoiceDate,
            dueDate: hasDueDate ? dueDate : nil
        ))

        if created != nil {
            await onCreated()
            dismiss()
        } else {
            errorMessage = "Création impossible."
        }
    }
}

// MARK: - Édition

struct EditInvoiceSheet: View {

    @Environment(\.dismiss) private var dismiss

    let invoice: InvoiceDetail
    let onSaved: () async -> Void

    @State private var number = ""
    @State private var amount = ""
    @State private var invoiceDate = Date()
    @State private var hasDueDate = false
    @State private var dueDate = Date()
    @State private var status = "draft"
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage { ErrorBanner(message: errorMessage) }

                    FormSection(title: "Numéro de facture") {
                        LeazrField(
                            icon: "number",
                            placeholder: "FAC-2026-000000",
                            text: $number,
                            autocapitalization: .characters
                        )
                    }

                    FormSection(title: "Montant (€)") {
                        LeazrField(
                            icon: "eurosign.circle",
                            placeholder: "0",
                            text: $amount,
                            keyboardType: .decimalPad
                        )
                    }

                    FormSection(title: "Statut") {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: 8)], spacing: 8) {
                            ForEach(InvoiceVocabulary.statuses, id: \.code) { option in
                                SelectChip(
                                    label: option.label,
                                    isSelected: status == option.code,
                                    tint: option.tint
                                ) { status = option.code }
                            }
                        }
                    }

                    FormSection(title: "Date de facture") {
                        DatePicker("", selection: $invoiceDate, displayedComponents: .date)
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
                                DatePicker("", selection: $dueDate, displayedComponents: .date)
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
            .navigationTitle("Modifier la facture")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .onAppear {
                number = invoice.invoiceNumber ?? ""
                amount = String(format: "%.2f", invoice.amount)
                invoiceDate = invoice.invoiceDate ?? invoice.createdAt ?? Date()
                if let due = invoice.dueDate { dueDate = due; hasDueDate = true }
                status = invoice.status
            }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        var payload: [String: AnyJSON] = [
            "invoice_number": number.isEmpty ? .null : .string(number),
            "status": .string(status),
            "invoice_date": .string(ISO8601DateFormatter.leazrTimestamp.string(from: invoiceDate)),
        ]
        if let value = Double(amount.replacingOccurrences(of: ",", with: ".")) {
            payload["amount"] = .double(value)
        }
        payload["due_date"] = hasDueDate
            ? .string(ISO8601DateFormatter.leazrTimestamp.string(from: dueDate))
            : .null

        if await InvoiceService.patch(invoiceId: invoice.id, payload) {
            await onSaved()
            dismiss()
        } else {
            errorMessage = "Enregistrement impossible."
        }
    }
}

// MARK: - Note de crédit

struct CreditNoteSheet: View {

    @Environment(\.dismiss) private var dismiss

    let invoice: InvoiceDetail
    let onCreated: () async -> Void

    @State private var amount = ""
    @State private var reason = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    private var value: Double? { Double(amount.replacingOccurrences(of: ",", with: ".")) }
    private var isTotal: Bool { (value ?? 0) >= invoice.amount }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage { ErrorBanner(message: errorMessage) }

                    Card {
                        VStack(spacing: 0) {
                            DetailRow(label: "Facture", value: invoice.invoiceNumber ?? "—")
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Montant facturé", value: Format.currency(invoice.amount))
                            if invoice.creditedAmount > 0 {
                                Divider().overlay(Theme.border)
                                DetailRow(label: "Déjà crédité", value: Format.currency(invoice.creditedAmount))
                            }
                        }
                    }

                    FormSection(title: "Montant à créditer (€)") {
                        VStack(spacing: 10) {
                            LeazrField(
                                icon: "eurosign.circle",
                                placeholder: "0",
                                text: $amount,
                                keyboardType: .decimalPad
                            )
                            TertiaryButton(title: "Créditer la totalité", systemImage: "equal.circle") {
                                amount = String(format: "%.2f", invoice.amount)
                            }
                        }
                    }

                    FormSection(title: "Motif") {
                        LeazrTextArea(placeholder: "Raison de l'avoir", text: $reason)
                    }

                    // Le web annule le contrat rattaché : c'est une conséquence
                    // lourde, elle doit être annoncée avant de valider.
                    if invoice.contractId != nil {
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 13))
                            Text("Le contrat rattaché à cette facture sera annulé.")
                                .font(.system(size: 13, weight: .medium))
                        }
                        .foregroundStyle(Theme.amber)
                        .padding(11)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(Theme.amber.opacity(0.13))
                        )
                    }

                    Text(isTotal
                        ? "La facture passera en « Créditée »."
                        : "La facture passera en « Crédit partiel ».")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    PrimaryButton(
                        title: "Créer la note de crédit",
                        systemImage: "arrow.uturn.backward.circle.fill",
                        isLoading: isSaving,
                        isEnabled: (value ?? 0) > 0 && !reason.trimmingCharacters(in: .whitespaces).isEmpty
                    ) {
                        Task { await save() }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Note de crédit")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
        }
    }

    private func save() async {
        guard let value else { return }
        isSaving = true
        defer { isSaving = false }

        guard let companyId = await Session.shared.resolve() else {
            errorMessage = "Société introuvable."
            return
        }

        let ok = await InvoiceService.createCreditNote(
            companyId: companyId,
            invoice: invoice,
            amount: value,
            reason: reason.trimmingCharacters(in: .whitespacesAndNewlines)
        )
        if ok {
            await onCreated()
            dismiss()
        } else {
            errorMessage = "Création impossible."
        }
    }
}
