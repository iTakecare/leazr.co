import Foundation
import SwiftUI
import Supabase

// MARK: - Formulaire d'article

/// Création et modification d'un article de stock.
struct StockItemFormSheet: View {

    @Environment(\.dismiss) private var dismiss

    let companyId: String?
    let item: StockItem?
    let suppliers: [ContractService.Supplier]
    let onSaved: () async -> Void

    @State private var input = StockService.ItemInput()
    @State private var priceText = ""
    @State private var hasReception = true
    @State private var receptionDate = Date()
    @State private var hasWarranty = false
    @State private var warrantyDate = Date()
    @State private var isSaving = false
    @State private var errorMessage: String?

    private var isEdit: Bool { item != nil }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage { ErrorBanner(message: errorMessage) }

                    FormSection(title: "Désignation") {
                        LeazrField(
                            icon: "cube.box",
                            placeholder: "Ex. MacBook Air 13 M3",
                            text: $input.title,
                            autocapitalization: .words
                        )
                    }

                    FormSection(title: "Numéro de série") {
                        LeazrField(
                            icon: "barcode",
                            placeholder: "Identifie l'appareil physique",
                            text: $input.serialNumber,
                            autocapitalization: .characters
                        )
                    }

                    FormSection(title: "Statut") {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: 8)], spacing: 8) {
                            ForEach(StockVocabulary.statuses, id: \.code) { option in
                                SelectChip(
                                    label: option.label,
                                    isSelected: input.status == option.code,
                                    tint: option.tint
                                ) { input.status = option.code }
                            }
                        }
                    }

                    FormSection(title: "État") {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 110), spacing: 8)], spacing: 8) {
                            ForEach(StockVocabulary.conditions, id: \.code) { option in
                                SelectChip(
                                    label: option.label,
                                    isSelected: input.condition == option.code,
                                    tint: Theme.teal
                                ) { input.condition = option.code }
                            }
                        }
                    }

                    FormSection(title: "Provenance") {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 130), spacing: 8)], spacing: 8) {
                            ForEach(StockVocabulary.sources, id: \.code) { option in
                                SelectChip(
                                    label: option.label,
                                    isSelected: input.source == option.code,
                                    tint: Theme.violet
                                ) { input.source = option.code }
                            }
                        }
                    }

                    FormSection(title: "Prix d'achat (€)") {
                        LeazrField(
                            icon: "eurosign.circle",
                            placeholder: "0",
                            text: $priceText,
                            keyboardType: .decimalPad
                        )
                    }

                    FormSection(title: "Quantité") {
                        Stepper("\(input.quantity)", value: $input.quantity, in: 1...500)
                            .padding(.horizontal, 16)
                            .frame(height: 50)
                            .background(
                                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                    .fill(Theme.surface)
                            )
                    }

                    FormSection(title: "Fournisseur") {
                        VStack(spacing: 8) {
                            MotifChoiceRow(label: "Non défini", isSelected: input.supplierId == nil) {
                                input.supplierId = nil
                            }
                            ForEach(suppliers) { supplier in
                                MotifChoiceRow(
                                    label: supplier.name,
                                    isSelected: input.supplierId == supplier.id
                                ) { input.supplierId = supplier.id }
                            }
                        }
                    }

                    FormSection(title: "Caractéristiques") {
                        VStack(spacing: 10) {
                            LeazrField(icon: "tag", placeholder: "Marque", text: $input.brand, autocapitalization: .words)
                            LeazrField(icon: "number", placeholder: "Modèle", text: $input.model, autocapitalization: .characters)
                            LeazrField(icon: "folder", placeholder: "Catégorie", text: $input.category, autocapitalization: .words)
                            LeazrField(icon: "cpu", placeholder: "Processeur", text: $input.cpu, autocapitalization: .characters)
                            LeazrField(icon: "memorychip", placeholder: "Mémoire", text: $input.memory, autocapitalization: .characters)
                            LeazrField(icon: "internaldrive", placeholder: "Stockage", text: $input.storage, autocapitalization: .characters)
                            LeazrField(icon: "star", placeholder: "Grade", text: $input.grade, autocapitalization: .characters)
                        }
                    }

                    FormSection(title: "Emplacement") {
                        LeazrField(
                            icon: "mappin",
                            placeholder: "Ex. Étagère B3",
                            text: $input.location,
                            autocapitalization: .words
                        )
                    }

                    dateField(title: "Date de réception", isOn: $hasReception, date: $receptionDate)
                    dateField(title: "Fin de garantie", isOn: $hasWarranty, date: $warrantyDate)

                    FormSection(title: "Notes") {
                        LeazrTextArea(placeholder: "Observations", text: $input.notes)
                    }

                    if !isEdit, input.status == "in_stock" {
                        Text("Une entrée directe en stock sera tracée par un mouvement de réception.")
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.mutedForeground)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    PrimaryButton(
                        title: isEdit ? "Enregistrer" : "Créer l'article",
                        systemImage: isEdit ? "checkmark.circle.fill" : "plus.circle.fill",
                        isLoading: isSaving,
                        isEnabled: !input.title.trimmingCharacters(in: .whitespaces).isEmpty
                    ) {
                        Task { await save() }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle(isEdit ? "Modifier l'article" : "Nouvel article")
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
        guard let item, input.title.isEmpty else { return }
        input.title = item.title
        input.serialNumber = item.serialNumber ?? ""
        input.status = item.status
        input.condition = item.condition ?? "good"
        input.source = item.source ?? "purchase"
        input.quantity = item.quantity
        input.supplierId = nil
        input.location = item.location ?? ""
        input.category = item.category ?? ""
        input.brand = item.brand ?? ""
        input.model = item.model ?? ""
        input.cpu = item.cpu ?? ""
        input.memory = item.memory ?? ""
        input.storage = item.storage ?? ""
        input.grade = item.grade ?? ""
        input.notes = item.notes ?? ""
        priceText = String(format: "%.2f", item.purchasePrice)
        if let date = item.receptionDate { receptionDate = date; hasReception = true } else { hasReception = false }
        if let date = item.warrantyEndDate { warrantyDate = date; hasWarranty = true }
    }

    private func save() async {
        guard let companyId else {
            errorMessage = "Société introuvable."
            return
        }
        isSaving = true
        defer { isSaving = false }

        input.purchasePrice = Double(priceText.replacingOccurrences(of: ",", with: ".")) ?? 0
        input.unitPrice = input.purchasePrice
        input.receptionDate = hasReception ? receptionDate : nil
        input.warrantyEndDate = hasWarranty ? warrantyDate : nil

        let ok: Bool
        if let item {
            ok = await StockService.updateItem(id: item.id, input)
        } else {
            ok = await StockService.createItem(companyId: companyId, input) != nil
        }

        if ok {
            await onSaved()
            dismiss()
        } else {
            errorMessage = isEdit ? "Enregistrement impossible." : "Création impossible."
        }
    }
}

// MARK: - Coûts additionnels

/// Coûts imputés à un article après son entrée en stock : réparation,
/// amélioration, pièce, transport. Ils grèvent sa valeur réelle.
struct StockCostsSection: View {

    let item: StockItem
    let companyId: String?

    @State private var costs: [StockItemCost] = []
    @State private var isAdding = false

    private var total: Double { costs.reduce(0) { $0 + $1.amount } }

    var body: some View {
        VStack(spacing: 12) {
            SectionHeader(title: "Coûts additionnels", count: costs.count)

            if total > 0 {
                Card {
                    VStack(spacing: 0) {
                        DetailRow(label: "Prix d'achat", value: Format.currency(item.purchasePrice))
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Coûts engagés", value: Format.currency(total))
                        Divider().overlay(Theme.border)
                        DetailRow(
                            label: "Coût de revient",
                            value: Format.currency(item.purchasePrice + total),
                            emphasis: true
                        )
                    }
                }
            }

            ForEach(costs) { cost in
                Card {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(cost.label)
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(Theme.foreground)
                                Text(cost.categoryLabel)
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundStyle(cost.categoryTint)
                                    .padding(.horizontal, 7)
                                    .padding(.vertical, 3)
                                    .background(Capsule().fill(cost.categoryTint.opacity(0.15)))
                            }

                            Spacer(minLength: 8)

                            Text(Format.currency(cost.amount))
                                .font(.system(size: 15, weight: .bold))
                                .foregroundStyle(Theme.foreground)
                        }

                        if let notes = cost.notes, !notes.isEmpty {
                            Text(notes)
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.mutedForeground)
                        }

                        HStack {
                            Text(Format.date(cost.costDate))
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.mutedForeground)
                            Spacer()
                            Button(role: .destructive) {
                                Task {
                                    _ = await StockService.deleteCost(id: cost.id)
                                    await load()
                                }
                            } label: {
                                Image(systemName: "trash")
                                    .font(.system(size: 12))
                                    .foregroundStyle(Theme.destructive)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }

            TertiaryButton(title: "Ajouter un coût", systemImage: "plus.circle") {
                isAdding = true
            }
        }
        .sheet(isPresented: $isAdding) {
            AddCostSheet(companyId: companyId, stockItemId: item.id) { await load() }
                .presentationDetents([.medium, .large])
        }
        .task { await load() }
    }

    private func load() async {
        costs = await StockService.costs(stockItemId: item.id)
    }
}

struct AddCostSheet: View {

    @Environment(\.dismiss) private var dismiss

    let companyId: String?
    let stockItemId: String
    let onSaved: () async -> Void

    @State private var label = ""
    @State private var amount = ""
    @State private var category = "repair"
    @State private var date = Date()
    @State private var notes = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage { ErrorBanner(message: errorMessage) }

                    FormSection(title: "Intitulé") {
                        LeazrField(
                            icon: "text.alignleft",
                            placeholder: "Ex. Remplacement batterie",
                            text: $label,
                            autocapitalization: .sentences
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

                    FormSection(title: "Catégorie") {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: 8)], spacing: 8) {
                            ForEach(StockVocabulary.costCategories, id: \.code) { option in
                                SelectChip(
                                    label: option.label,
                                    isSelected: category == option.code,
                                    tint: StockVocabulary.costCategoryTint(option.code)
                                ) { category = option.code }
                            }
                        }
                    }

                    FormSection(title: "Date") {
                        DatePicker("", selection: $date, displayedComponents: .date)
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

                    FormSection(title: "Notes") {
                        LeazrTextArea(placeholder: "Détail de la dépense", text: $notes)
                    }

                    PrimaryButton(
                        title: "Ajouter",
                        systemImage: "plus.circle.fill",
                        isLoading: isSaving,
                        isEnabled: !label.trimmingCharacters(in: .whitespaces).isEmpty
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
            .navigationTitle("Coût additionnel")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
        }
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

        let ok = await StockService.addCost(
            companyId: companyId,
            stockItemId: stockItemId,
            label: label.trimmingCharacters(in: .whitespaces),
            amount: value,
            category: category,
            date: date,
            notes: notes.isEmpty ? nil : notes
        )

        if ok {
            await onSaved()
            dismiss()
        } else {
            errorMessage = "Enregistrement impossible."
        }
    }
}

// MARK: - Réparation

struct StartRepairSheet: View {

    @Environment(\.dismiss) private var dismiss

    let item: StockItem
    let companyId: String?
    let suppliers: [ContractService.Supplier]
    let onStarted: () async -> Void

    @State private var reason = ""
    @State private var description = ""
    @State private var cost = ""
    @State private var supplierId: String?
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage { ErrorBanner(message: errorMessage) }

                    FormSection(title: "Panne constatée") {
                        LeazrField(
                            icon: "exclamationmark.triangle",
                            placeholder: "Ex. Écran cassé",
                            text: $reason,
                            autocapitalization: .sentences
                        )
                    }

                    FormSection(title: "Détail") {
                        LeazrTextArea(placeholder: "Ce qui a été observé", text: $description)
                    }

                    FormSection(title: "Coût estimé (€)") {
                        LeazrField(
                            icon: "eurosign.circle",
                            placeholder: "0",
                            text: $cost,
                            keyboardType: .decimalPad
                        )
                    }

                    FormSection(title: "Réparateur") {
                        VStack(spacing: 8) {
                            MotifChoiceRow(label: "Non défini", isSelected: supplierId == nil) {
                                supplierId = nil
                            }
                            ForEach(suppliers) { supplier in
                                MotifChoiceRow(
                                    label: supplier.name,
                                    isSelected: supplierId == supplier.id
                                ) { supplierId = supplier.id }
                            }
                        }
                    }

                    Text("L'article passera en « En réparation » et le départ sera tracé.")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    PrimaryButton(
                        title: "Envoyer en réparation",
                        systemImage: "wrench.and.screwdriver.fill",
                        isLoading: isSaving,
                        isEnabled: !reason.trimmingCharacters(in: .whitespaces).isEmpty
                    ) {
                        Task { await save() }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Réparation")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
        }
    }

    private func save() async {
        guard let companyId else {
            errorMessage = "Société introuvable."
            return
        }
        isSaving = true
        defer { isSaving = false }

        let ok = await StockService.startRepair(
            companyId: companyId,
            item: item,
            reason: reason.trimmingCharacters(in: .whitespaces),
            description: description.isEmpty ? nil : description,
            cost: Double(cost.replacingOccurrences(of: ",", with: ".")) ?? 0,
            supplierId: supplierId
        )

        if ok {
            await onStarted()
            dismiss()
        } else {
            errorMessage = "Envoi impossible."
        }
    }
}

// MARK: - Swap

/// Remplacement d'un appareil sur un contrat. L'ancien revient en stock en
/// état défectueux, le contrat prend le nouveau — la mensualité ne bouge pas.
struct SwapSheet: View {

    @Environment(\.dismiss) private var dismiss

    let contractId: String
    let offerId: String?
    let equipment: ContractEquipment
    let onDone: () async -> Void

    @State private var newTitle = ""
    @State private var newSerial = ""
    @State private var newPrice = ""
    @State private var reason = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    private var delta: Double? {
        guard let price = Double(newPrice.replacingOccurrences(of: ",", with: ".")) else { return nil }
        return price - equipment.purchasePrice
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage { ErrorBanner(message: errorMessage) }

                    Card {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Appareil remplacé")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Theme.mutedForeground)
                            Text(equipment.title)
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(Theme.foreground)
                            if let serial = equipment.serialNumber, !serial.isEmpty {
                                Text(serial)
                                    .font(.system(size: 12, design: .monospaced))
                                    .foregroundStyle(Theme.mutedForeground)
                            }
                            Text("Prix d'achat : \(Format.currency(equipment.purchasePrice))")
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }

                    FormSection(title: "Nouvel appareil") {
                        VStack(spacing: 10) {
                            LeazrField(
                                icon: "cube.box",
                                placeholder: "Désignation",
                                text: $newTitle,
                                autocapitalization: .words
                            )
                            LeazrField(
                                icon: "barcode",
                                placeholder: "Numéro de série",
                                text: $newSerial,
                                autocapitalization: .characters
                            )
                            LeazrField(
                                icon: "eurosign.circle",
                                placeholder: "Prix d'achat réel",
                                text: $newPrice,
                                keyboardType: .decimalPad
                            )
                        }
                    }

                    if let delta {
                        Card {
                            HStack {
                                Text("Écart de prix d'achat")
                                    .font(.system(size: 14))
                                    .foregroundStyle(Theme.mutedForeground)
                                Spacer()
                                Text("\(delta >= 0 ? "+" : "")\(Format.currency(delta))")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundStyle(delta > 0 ? Theme.destructive : Theme.emerald)
                            }
                        }
                    }

                    FormSection(title: "Motif du remplacement") {
                        LeazrTextArea(placeholder: "Panne, casse, évolution du besoin…", text: $reason)
                    }

                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: "info.circle.fill").font(.system(size: 13))
                        Text("L'ancien appareil entrera en stock en état défectueux. La mensualité du client reste inchangée ; seule la marge du contrat bouge.")
                            .font(.system(size: 12))
                    }
                    .foregroundStyle(Theme.sky)
                    .padding(11)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(Theme.sky.opacity(0.12))
                    )

                    PrimaryButton(
                        title: "Effectuer le swap",
                        systemImage: "arrow.left.arrow.right",
                        isLoading: isSaving,
                        isEnabled: !newTitle.trimmingCharacters(in: .whitespaces).isEmpty
                            && Double(newPrice.replacingOccurrences(of: ",", with: ".")) != nil
                    ) {
                        Task { await save() }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Swap d'équipement")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
        }
    }

    private func save() async {
        guard let price = Double(newPrice.replacingOccurrences(of: ",", with: ".")) else { return }
        isSaving = true
        defer { isSaving = false }

        guard let companyId = await Session.shared.resolve() else {
            errorMessage = "Société introuvable."
            return
        }

        let ok = await StockService.swap(
            companyId: companyId,
            contractId: contractId,
            offerId: offerId,
            equipment: equipment,
            newTitle: newTitle.trimmingCharacters(in: .whitespaces),
            newSerialNumber: newSerial.isEmpty ? nil : newSerial,
            newPurchasePrice: price,
            reason: reason.trimmingCharacters(in: .whitespacesAndNewlines)
        )

        if ok {
            await onDone()
            dismiss()
        } else {
            errorMessage = "Le swap n'a pas pu être enregistré."
        }
    }
}
