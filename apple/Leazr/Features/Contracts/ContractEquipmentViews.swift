import Foundation
import SwiftUI
import Supabase

// MARK: - Équipement du contrat

/// Une ligne d'équipement, avec ses numéros de série et son rachat éventuel.
struct ContractEquipmentCard: View {

    let item: ContractEquipment
    let companyId: String?
    let contractId: String
    let onChanged: () async -> Void

    @State private var isEditingSerials = false
    @State private var isBuyingBack = false

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "laptopcomputer")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 34, height: 34)
                        .background(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(item.isBoughtBack ? Theme.mutedForeground : Theme.sky)
                        )

                    VStack(alignment: .leading, spacing: 3) {
                        Text(item.title)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Theme.foreground)
                            .multilineTextAlignment(.leading)

                        if item.quantity > 1 {
                            Text("×\(item.quantity)")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }

                    Spacer(minLength: 4)

                    Text(Format.currency(item.monthlyPayment))
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(Theme.primary)
                }

                Divider().overlay(Theme.border)

                // Les numéros de série sont ce qui relie la ligne au matériel
                // physique : ils méritent d'être visibles, pas enfouis.
                if item.notSerializable {
                    Label("Non sérialisable", systemImage: "minus.circle")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                } else {
                    let serials = item.serialNumbers.filter { !$0.isEmpty }
                    if serials.isEmpty {
                        Label("Aucun numéro de série", systemImage: "barcode")
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.amber)
                    } else {
                        VStack(alignment: .leading, spacing: 3) {
                            ForEach(Array(serials.enumerated()), id: \.offset) { index, serial in
                                Text("#\(index + 1) — \(serial)")
                                    .font(.system(size: 12, design: .monospaced))
                                    .foregroundStyle(Theme.mutedForeground)
                            }
                        }
                    }
                }

                if item.isBoughtBack {
                    HStack(spacing: 6) {
                        Image(systemName: "arrow.triangle.2.circlepath")
                            .font(.system(size: 11, weight: .bold))
                        Text("Repris le \(Format.date(item.boughtBackAt)) pour \(Format.currency(item.boughtBackPrice ?? 0))")
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundStyle(Theme.teal)
                }

                HStack(spacing: 10) {
                    ActionButton(title: "Séries", icon: "barcode", tint: Theme.sky) {
                        isEditingSerials = true
                    }

                    if !item.isBoughtBack {
                        ActionButton(title: "Racheter", icon: "arrow.triangle.2.circlepath", tint: Theme.teal) {
                            isBuyingBack = true
                        }
                    }
                }
            }
        }
        .sheet(isPresented: $isEditingSerials) {
            SerialNumbersSheet(item: item) { await onChanged() }
        }
        .sheet(isPresented: $isBuyingBack) {
            BuyBackSheet(item: item, contractId: contractId) { await onChanged() }
        }
    }
}

/// Saisie des numéros de série, un par unité — c'est la granularité du web.
struct SerialNumbersSheet: View {

    @Environment(\.dismiss) private var dismiss

    let item: ContractEquipment
    let onSaved: () async -> Void

    @State private var serials: [String] = []
    @State private var notSerializable = false
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage {
                        ErrorBanner(message: errorMessage)
                    }

                    Card {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.title)
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(Theme.foreground)
                            Text("\(item.quantity) unité\(item.quantity > 1 ? "s" : "")")
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }

                    Toggle("Matériel non sérialisable", isOn: $notSerializable)
                        .tint(Theme.primary)
                        .font(.system(size: 15))
                        .padding(.horizontal, 16)
                        .frame(height: 52)
                        .background(
                            RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                .fill(Theme.surface)
                        )

                    if !notSerializable {
                        FormSection(title: "Numéros de série") {
                            VStack(spacing: 10) {
                                ForEach(serials.indices, id: \.self) { index in
                                    HStack(spacing: 10) {
                                        Text("#\(index + 1)")
                                            .font(.system(size: 13, weight: .semibold))
                                            .foregroundStyle(Theme.mutedForeground)
                                            .frame(width: 28, alignment: .leading)

                                        TextField("Numéro de série", text: $serials[index])
                                            .font(.system(size: 15, design: .monospaced))
                                            .textInputAutocapitalization(.characters)
                                            .autocorrectionDisabled()
                                            .padding(.horizontal, 12)
                                            .frame(height: 46)
                                            .background(
                                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                                    .fill(Theme.surface)
                                            )
                                    }
                                }
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
            .navigationTitle("Numéros de série")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .onAppear {
                serials = item.serialNumbers
                notSerializable = item.notSerializable
            }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        let ok = await ContractService.setSerialNumbers(
            equipmentId: item.id,
            serials: notSerializable ? [] : serials,
            notSerializable: notSerializable
        )
        if ok {
            await onSaved()
            dismiss()
        } else {
            errorMessage = "Enregistrement impossible."
        }
    }
}

/// Rachat de fin de contrat : l'appareil sort du contrat et entre en stock.
struct BuyBackSheet: View {

    @Environment(\.dismiss) private var dismiss

    let item: ContractEquipment
    let contractId: String
    let onDone: () async -> Void

    @State private var price = ""
    @State private var condition = "good"
    @State private var notes = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    private static let conditions: [(code: String, label: String)] = [
        ("new", "Neuf"),
        ("like_new", "Comme neuf"),
        ("good", "Bon état"),
        ("fair", "État moyen"),
        ("defective", "Défectueux"),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage {
                        ErrorBanner(message: errorMessage)
                    }

                    Card {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.title)
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(Theme.foreground)
                            if let serial = item.serialNumber, !serial.isEmpty {
                                Text(serial)
                                    .font(.system(size: 12, design: .monospaced))
                                    .foregroundStyle(Theme.mutedForeground)
                            }
                            Text("Prix d'achat d'origine : \(Format.currency(item.purchasePrice))")
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }

                    FormSection(title: "Prix de rachat (€)") {
                        LeazrField(
                            icon: "eurosign.circle",
                            placeholder: "0",
                            text: $price,
                            keyboardType: .decimalPad
                        )
                    }

                    FormSection(title: "État du matériel") {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 110), spacing: 8)], spacing: 8) {
                            ForEach(Self.conditions, id: \.code) { option in
                                SelectChip(
                                    label: option.label,
                                    isSelected: condition == option.code,
                                    tint: Theme.teal
                                ) { condition = option.code }
                            }
                        }
                    }

                    FormSection(title: "Notes") {
                        LeazrTextArea(placeholder: "État constaté, accessoires manquants…", text: $notes)
                    }

                    Text("L'appareil entrera en stock avec la provenance « Reprise contrat », et un mouvement sera tracé.")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    PrimaryButton(
                        title: "Racheter et mettre en stock",
                        systemImage: "arrow.triangle.2.circlepath",
                        isLoading: isSaving,
                        isEnabled: Double(price.replacingOccurrences(of: ",", with: ".")) != nil
                    ) {
                        Task { await save() }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Rachat de matériel")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
        }
    }

    private func save() async {
        guard let value = Double(price.replacingOccurrences(of: ",", with: ".")) else { return }
        isSaving = true
        defer { isSaving = false }

        guard let companyId = await Session.shared.resolve() else {
            errorMessage = "Société introuvable."
            return
        }

        let ok = await ContractService.buyBack(
            companyId: companyId,
            contractId: contractId,
            equipment: item,
            price: value,
            condition: condition,
            notes: notes.isEmpty ? nil : notes
        )
        if ok {
            await onDone()
            dismiss()
        } else {
            errorMessage = "Le rachat n'a pas pu être enregistré."
        }
    }
}

// MARK: - Suivi des achats

/// Commande fournisseur d'une ligne : statut, fournisseur, prix payé, dates.
struct PurchaseTrackingCard: View {

    let item: ContractEquipment
    let suppliers: [ContractService.Supplier]
    let supplierName: String?
    let onChanged: () async -> Void

    @State private var isEditing = false

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(item.title)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Theme.foreground)
                            .multilineTextAlignment(.leading)
                        if item.quantity > 1 {
                            Text("×\(item.quantity)")
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }

                    Spacer(minLength: 8)

                    Text(OrderStatusVocabulary.label(item.orderStatus))
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(OrderStatusVocabulary.tint(item.orderStatus))
                        .padding(.horizontal, 9)
                        .padding(.vertical, 4)
                        .background(
                            Capsule().fill(OrderStatusVocabulary.tint(item.orderStatus).opacity(0.15))
                        )
                }

                VStack(spacing: 0) {
                    DetailRow(label: "Fournisseur", value: supplierName ?? "Non défini")
                    Divider().overlay(Theme.border)
                    DetailRow(
                        label: "Prix fournisseur",
                        value: item.supplierPrice.map(Format.currency) ?? "—"
                    )
                    if item.orderDate != nil {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Commandé le", value: Format.date(item.orderDate))
                    }
                    if let reference = item.orderReference, !reference.isEmpty {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Référence", value: reference)
                    }
                    if item.receptionDate != nil {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Reçu le", value: Format.date(item.receptionDate))
                    }
                }

                if let notes = item.orderNotes, !notes.isEmpty {
                    Text(notes)
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.mutedForeground)
                }

                ActionButton(title: "Modifier la commande", icon: "square.and.pencil", tint: Theme.primary) {
                    isEditing = true
                }
            }
        }
        .sheet(isPresented: $isEditing) {
            PurchaseTrackingSheet(item: item, suppliers: suppliers) { await onChanged() }
        }
    }
}

struct PurchaseTrackingSheet: View {

    @Environment(\.dismiss) private var dismiss

    let item: ContractEquipment
    let suppliers: [ContractService.Supplier]
    let onSaved: () async -> Void

    @State private var status = "to_order"
    @State private var supplierId: String?
    @State private var supplierPrice = ""
    @State private var reference = ""
    @State private var notes = ""
    @State private var hasOrderDate = false
    @State private var orderDate = Date()
    @State private var hasReceptionDate = false
    @State private var receptionDate = Date()
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage {
                        ErrorBanner(message: errorMessage)
                    }

                    FormSection(title: "Statut de commande") {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: 8)], spacing: 8) {
                            ForEach(OrderStatusVocabulary.all, id: \.code) { option in
                                SelectChip(
                                    label: option.label,
                                    isSelected: status == option.code,
                                    tint: option.tint
                                ) { status = option.code }
                            }
                        }
                    }

                    FormSection(title: "Fournisseur") {
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

                    FormSection(title: "Prix fournisseur (€)") {
                        LeazrField(
                            icon: "eurosign.circle",
                            placeholder: "0",
                            text: $supplierPrice,
                            keyboardType: .decimalPad
                        )
                    }

                    FormSection(title: "Référence de commande") {
                        LeazrField(
                            icon: "number",
                            placeholder: "Bon de commande",
                            text: $reference,
                            autocapitalization: .characters
                        )
                    }

                    dateField(title: "Date de commande", isOn: $hasOrderDate, date: $orderDate)
                    dateField(title: "Date de réception", isOn: $hasReceptionDate, date: $receptionDate)

                    FormSection(title: "Notes") {
                        LeazrTextArea(placeholder: "Délai annoncé, incident…", text: $notes)
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
            .navigationTitle("Commande fournisseur")
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
        status = item.orderStatus ?? "to_order"
        supplierId = item.supplierId
        if let price = item.supplierPrice { supplierPrice = String(format: "%.2f", price) }
        reference = item.orderReference ?? ""
        notes = item.orderNotes ?? ""
        if let date = item.orderDate { orderDate = date; hasOrderDate = true }
        if let date = item.receptionDate { receptionDate = date; hasReceptionDate = true }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        let price = Double(supplierPrice.replacingOccurrences(of: ",", with: "."))

        var payload: [String: AnyJSON] = [
            "order_status": .string(status),
            "supplier_id": supplierId.map(AnyJSON.string) ?? .null,
            "supplier_price": price.map { AnyJSON.double($0) } ?? .null,
            "order_reference": reference.isEmpty ? .null : .string(reference),
            "order_notes": notes.isEmpty ? .null : .string(notes),
            "order_date": hasOrderDate ? .string(Format.day(orderDate)) : .null,
            "reception_date": hasReceptionDate ? .string(Format.day(receptionDate)) : .null,
        ]
        // Le tableau de bord des achats lit `actual_purchase_*` : les tenir
        // synchronisés évite deux chiffres contradictoires.
        payload["actual_purchase_price"] = price.map { AnyJSON.double($0) } ?? .null
        payload["actual_purchase_date"] = hasOrderDate ? .string(Format.day(orderDate)) : .null

        if await ContractService.updateOrder(equipmentId: item.id, payload) {
            await onSaved()
            dismiss()
        } else {
            errorMessage = "Enregistrement impossible."
        }
    }
}
