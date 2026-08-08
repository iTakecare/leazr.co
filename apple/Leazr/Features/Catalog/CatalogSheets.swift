import Foundation
import SwiftUI
import Supabase

// MARK: - Formulaire produit

/// Création et modification d'un produit, avec génération IA de la description
/// et des caractéristiques.
struct ProductFormSheet: View {

    @Environment(\.dismiss) private var dismiss

    @Bindable var store: CatalogStore
    let product: CatalogProduct?
    let onSaved: () async -> Void

    @State private var input = CatalogService.ProductInput()
    @State private var priceText = ""
    @State private var monthlyText = ""
    @State private var stockText = ""
    @State private var specKey = ""
    @State private var specValue = ""
    @State private var isGenerating = false
    @State private var isSaving = false
    @State private var errorMessage: String?

    private var isEdit: Bool { product != nil }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage { ErrorBanner(message: errorMessage) }

                    FormSection(title: "Nom du produit") {
                        LeazrField(
                            icon: "shippingbox",
                            placeholder: "Ex. MacBook Air 13 M3",
                            text: $input.name,
                            autocapitalization: .words
                        )
                    }

                    FormSection(title: "Marque") {
                        VStack(spacing: 8) {
                            MotifChoiceRow(label: "Non définie", isSelected: input.brandId == nil) {
                                input.brandId = nil
                            }
                            ForEach(store.brands) { brand in
                                MotifChoiceRow(label: brand.label, isSelected: input.brandId == brand.id) {
                                    input.brandId = brand.id
                                }
                            }
                        }
                    }

                    FormSection(title: "Catégorie") {
                        VStack(spacing: 8) {
                            MotifChoiceRow(label: "Non définie", isSelected: input.categoryId == nil) {
                                input.categoryId = nil
                            }
                            ForEach(store.categories) { category in
                                MotifChoiceRow(
                                    label: category.label,
                                    isSelected: input.categoryId == category.id
                                ) { input.categoryId = category.id }
                            }
                        }
                    }

                    FormSection(title: "Description courte") {
                        LeazrTextArea(placeholder: "Une phrase d'accroche", text: $input.shortDescription)
                    }

                    FormSection(title: "Description") {
                        VStack(spacing: 10) {
                            LeazrTextArea(placeholder: "Description détaillée", text: $input.description)

                            // La génération demande au serveur, pas au téléphone :
                            // le gabarit et le modèle restent côté web.
                            TertiaryButton(
                                title: isGenerating ? "Génération…" : "Générer avec l'IA",
                                systemImage: "sparkles"
                            ) {
                                Task { await generate() }
                            }
                            .disabled(isGenerating || input.name.isEmpty)
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

                    FormSection(title: "Mensualité (€)") {
                        LeazrField(
                            icon: "calendar.badge.clock",
                            placeholder: "Optionnelle",
                            text: $monthlyText,
                            keyboardType: .decimalPad
                        )
                    }

                    FormSection(title: "Références") {
                        VStack(spacing: 10) {
                            LeazrField(
                                icon: "number",
                                placeholder: "Modèle",
                                text: $input.model,
                                autocapitalization: .characters
                            )
                            LeazrField(
                                icon: "barcode",
                                placeholder: "SKU",
                                text: $input.sku,
                                autocapitalization: .characters
                            )
                            LeazrField(
                                icon: "cube.box",
                                placeholder: "Stock",
                                text: $stockText,
                                keyboardType: .numberPad
                            )
                        }
                    }

                    specificationsSection

                    FormSection(title: "Visibilité") {
                        VStack(spacing: 10) {
                            Toggle("Produit actif", isOn: $input.isActive)
                                .tint(Theme.primary)
                                .font(.system(size: 15))
                                .padding(.horizontal, 16)
                                .frame(height: 52)
                                .background(
                                    RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                        .fill(Theme.surface)
                                )
                            Toggle("Administrateurs seulement", isOn: $input.adminOnly)
                                .tint(Theme.primary)
                                .font(.system(size: 15))
                                .padding(.horizontal, 16)
                                .frame(height: 52)
                                .background(
                                    RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                        .fill(Theme.surface)
                                )
                        }
                    }

                    PrimaryButton(
                        title: isEdit ? "Enregistrer" : "Créer le produit",
                        systemImage: isEdit ? "checkmark.circle.fill" : "plus.circle.fill",
                        isLoading: isSaving,
                        isEnabled: !input.name.trimmingCharacters(in: .whitespaces).isEmpty
                    ) {
                        Task { await save() }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle(isEdit ? "Modifier le produit" : "Nouveau produit")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .onAppear(perform: prefill)
        }
    }

    private var specificationsSection: some View {
        FormSection(title: "Caractéristiques") {
            VStack(spacing: 10) {
                ForEach(input.specifications.keys.sorted(), id: \.self) { key in
                    HStack(spacing: 10) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(key)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Theme.foreground)
                            Text(input.specifications[key] ?? "")
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                        Spacer()
                        Button(role: .destructive) {
                            input.specifications.removeValue(forKey: key)
                        } label: {
                            Image(systemName: "trash")
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.destructive)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(
                        RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                            .fill(Theme.surface)
                    )
                }

                HStack(spacing: 10) {
                    LeazrField(
                        icon: "tag",
                        placeholder: "Caractéristique",
                        text: $specKey,
                        autocapitalization: .sentences
                    )
                    LeazrField(
                        icon: "text.alignleft",
                        placeholder: "Valeur",
                        text: $specValue,
                        autocapitalization: .sentences
                    )
                }

                TertiaryButton(title: "Ajouter la caractéristique", systemImage: "plus.circle") {
                    let key = specKey.trimmingCharacters(in: .whitespaces)
                    let value = specValue.trimmingCharacters(in: .whitespaces)
                    guard !key.isEmpty, !value.isEmpty else { return }
                    input.specifications[key] = value
                    specKey = ""
                    specValue = ""
                }
            }
        }
    }

    private func prefill() {
        guard let product, input.name.isEmpty else { return }
        input.name = product.name
        input.brandId = product.brandId
        input.categoryId = product.categoryId
        input.description = product.description ?? ""
        input.shortDescription = product.shortDescription ?? ""
        input.model = product.model ?? ""
        input.sku = product.sku ?? ""
        input.isActive = product.isActive
        input.adminOnly = product.adminOnly
        input.specifications = product.specifications
        priceText = String(format: "%.2f", product.price)
        if let monthly = product.monthlyPrice { monthlyText = String(format: "%.2f", monthly) }
        if let stock = product.stock { stockText = String(stock) }
    }

    private func generate() async {
        isGenerating = true
        defer { isGenerating = false }
        errorMessage = nil

        let brand = store.brands.first { $0.id == input.brandId }?.label ?? ""
        let category = store.categories.first { $0.id == input.categoryId }?.label ?? ""

        do {
            let result = try await CatalogService.generateDescription(
                productName: input.name,
                brand: brand,
                category: category,
                includeSpecifications: true
            )
            if let description = result.description { input.description = description }
            for (key, value) in result.specifications where input.specifications[key] == nil {
                input.specifications[key] = value
            }
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "Génération impossible."
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        input.price = Double(priceText.replacingOccurrences(of: ",", with: ".")) ?? 0
        input.monthlyPrice = Double(monthlyText.replacingOccurrences(of: ",", with: "."))
        input.stock = Int(stockText)

        let ok: Bool
        if let product {
            ok = await CatalogService.updateProduct(id: product.id, input)
        } else {
            ok = await CatalogService.createProduct(input) != nil
        }

        if ok {
            await onSaved()
            dismiss()
        } else {
            errorMessage = isEdit ? "Enregistrement impossible." : "Création impossible."
        }
    }
}

// MARK: - Variantes

/// Axes de variation et prix par combinaison.
struct VariantsSheet: View {

    @Environment(\.dismiss) private var dismiss

    let product: CatalogProduct
    let variants: [ProductVariant]
    let onSaved: () async -> Void

    @State private var attributes: [String: [String]] = [:]
    @State private var newAxis = ""
    @State private var newValue = ""
    @State private var selectedAxis: String?
    @State private var editing: ProductVariant?
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage { ErrorBanner(message: errorMessage) }

                    FormSection(title: "Axes de variation") {
                        VStack(spacing: 10) {
                            ForEach(attributes.keys.sorted(), id: \.self) { axis in
                                Card {
                                    VStack(alignment: .leading, spacing: 8) {
                                        HStack {
                                            Text(axis)
                                                .font(.system(size: 14, weight: .semibold))
                                                .foregroundStyle(Theme.foreground)
                                            Spacer()
                                            Button(role: .destructive) {
                                                attributes.removeValue(forKey: axis)
                                                if selectedAxis == axis { selectedAxis = nil }
                                            } label: {
                                                Image(systemName: "trash")
                                                    .font(.system(size: 12))
                                                    .foregroundStyle(Theme.destructive)
                                            }
                                            .buttonStyle(.plain)
                                        }

                                        Text((attributes[axis] ?? []).joined(separator: " · "))
                                            .font(.system(size: 13))
                                            .foregroundStyle(Theme.mutedForeground)

                                        HStack(spacing: 8) {
                                            SelectChip(
                                                label: "Ajouter une valeur",
                                                isSelected: selectedAxis == axis
                                            ) { selectedAxis = selectedAxis == axis ? nil : axis }
                                        }

                                        if selectedAxis == axis {
                                            HStack(spacing: 10) {
                                                LeazrField(
                                                    icon: "plus",
                                                    placeholder: "Valeur",
                                                    text: $newValue,
                                                    autocapitalization: .words
                                                )
                                                Button {
                                                    let value = newValue.trimmingCharacters(in: .whitespaces)
                                                    guard !value.isEmpty else { return }
                                                    attributes[axis, default: []].append(value)
                                                    newValue = ""
                                                } label: {
                                                    Image(systemName: "checkmark.circle.fill")
                                                        .font(.system(size: 22))
                                                        .foregroundStyle(Theme.primary)
                                                }
                                                .buttonStyle(.plain)
                                            }
                                        }
                                    }
                                }
                            }

                            HStack(spacing: 10) {
                                LeazrField(
                                    icon: "slider.horizontal.3",
                                    placeholder: "Nouvel axe (ex. Couleur)",
                                    text: $newAxis,
                                    autocapitalization: .words
                                )
                                Button {
                                    let axis = newAxis.trimmingCharacters(in: .whitespaces)
                                    guard !axis.isEmpty, attributes[axis] == nil else { return }
                                    attributes[axis] = []
                                    newAxis = ""
                                } label: {
                                    Image(systemName: "plus.circle.fill")
                                        .font(.system(size: 22))
                                        .foregroundStyle(Theme.primary)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    SectionHeader(title: "Combinaisons tarifées", count: variants.count)

                    if variants.isEmpty {
                        Text("Aucune combinaison enregistrée. Définissez les axes, puis ajoutez les prix combinaison par combinaison.")
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.mutedForeground)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    ForEach(variants) { variant in
                        Card {
                            HStack {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(variant.label.isEmpty ? "Variante" : variant.label)
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundStyle(Theme.foreground)
                                    Text(Format.currency(variant.price))
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundStyle(Theme.primary)
                                }
                                Spacer()
                                Button(role: .destructive) {
                                    Task {
                                        _ = await CatalogService.deleteVariant(id: variant.id)
                                        await onSaved()
                                    }
                                } label: {
                                    Image(systemName: "trash")
                                        .font(.system(size: 13))
                                        .foregroundStyle(Theme.destructive)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    if !attributes.isEmpty {
                        TertiaryButton(title: "Ajouter une combinaison", systemImage: "plus.circle") {
                            editing = ProductVariant.empty(productId: product.id)
                        }
                    }

                    PrimaryButton(
                        title: "Enregistrer les axes",
                        systemImage: "checkmark.circle.fill",
                        isLoading: isSaving
                    ) {
                        Task { await saveAxes() }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Variantes")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Fermer") { dismiss() } }
            }
            .sheet(item: $editing) { variant in
                VariantEditorSheet(
                    productId: product.id,
                    axes: attributes,
                    variant: variant.id.isEmpty ? nil : variant
                ) { await onSaved() }
                .presentationDetents([.medium, .large])
            }
            .onAppear { attributes = product.variationAttributes }
        }
    }

    private func saveAxes() async {
        isSaving = true
        defer { isSaving = false }
        if await CatalogService.setVariationAttributes(productId: product.id, attributes: attributes) {
            await onSaved()
        } else {
            errorMessage = "Enregistrement impossible."
        }
    }
}

extension ProductVariant {
    /// Gabarit vide, pour ouvrir l'éditeur en création.
    static func empty(productId: String) -> ProductVariant {
        let json = """
        {"id":"","product_id":"\(productId)","attributes":{},"price":0}
        """
        // Forcé : le littéral est fixe, une erreur ici serait un bug de compilation.
        return try! JSONDecoder().decode(ProductVariant.self, from: Data(json.utf8))
    }
}

/// Saisie d'une combinaison : une valeur par axe, plus son prix.
struct VariantEditorSheet: View {

    @Environment(\.dismiss) private var dismiss

    let productId: String
    let axes: [String: [String]]
    let variant: ProductVariant?
    let onSaved: () async -> Void

    @State private var selection: [String: String] = [:]
    @State private var priceText = ""
    @State private var monthlyText = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    private var isComplete: Bool {
        axes.keys.allSatisfy { selection[$0]?.isEmpty == false }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage { ErrorBanner(message: errorMessage) }

                    ForEach(axes.keys.sorted(), id: \.self) { axis in
                        FormSection(title: axis) {
                            LazyVGrid(columns: [GridItem(.adaptive(minimum: 100), spacing: 8)], spacing: 8) {
                                ForEach(axes[axis] ?? [], id: \.self) { value in
                                    SelectChip(label: value, isSelected: selection[axis] == value) {
                                        selection[axis] = value
                                    }
                                }
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

                    FormSection(title: "Mensualité (€)") {
                        LeazrField(
                            icon: "calendar.badge.clock",
                            placeholder: "Optionnelle",
                            text: $monthlyText,
                            keyboardType: .decimalPad
                        )
                    }

                    PrimaryButton(
                        title: "Enregistrer",
                        systemImage: "checkmark.circle.fill",
                        isLoading: isSaving,
                        isEnabled: isComplete && Double(priceText.replacingOccurrences(of: ",", with: ".")) != nil
                    ) {
                        Task { await save() }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Combinaison")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .onAppear {
                if let variant {
                    selection = variant.attributes
                    priceText = String(format: "%.2f", variant.price)
                    if let monthly = variant.monthlyPrice {
                        monthlyText = String(format: "%.2f", monthly)
                    }
                }
            }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        let ok = await CatalogService.saveVariant(
            productId: productId,
            variantId: variant?.id.isEmpty == false ? variant?.id : nil,
            attributes: selection,
            price: Double(priceText.replacingOccurrences(of: ",", with: ".")) ?? 0,
            monthlyPrice: Double(monthlyText.replacingOccurrences(of: ",", with: "."))
        )

        if ok {
            await onSaved()
            dismiss()
        } else {
            errorMessage = "Enregistrement impossible."
        }
    }
}
