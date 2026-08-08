import Foundation
import Observation
import SwiftUI
import PhotosUI
import Supabase

/// Fiche produit : visuels, informations, spécifications et variantes.
struct ProductDetailView: View {

    let productId: String
    @Bindable var store: CatalogStore

    @Environment(\.dismiss) private var dismiss

    @State private var product: CatalogProduct?
    @State private var variants: [ProductVariant] = []
    @State private var isLoading = false
    @State private var isEditing = false
    @State private var isManagingVariants = false
    @State private var isDeleting = false
    @State private var pickedPhoto: PhotosPickerItem?
    @State private var isUploading = false
    @State private var message: String?
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let errorMessage { ErrorBanner(message: errorMessage) }
                if let message { InfoBanner(message: message) }

                if let product {
                    gallery(product)
                    identity(product)
                    pricing(product)

                    if !product.specifications.isEmpty {
                        specifications(product)
                    }

                    if product.isParent || !variants.isEmpty {
                        variantsSection(product)
                    }

                    actions(product)
                } else if isLoading {
                    ProgressView().tint(Theme.mutedForeground).padding(.top, 40)
                } else {
                    EmptyHint(icon: "shippingbox", label: "Produit introuvable")
                }
            }
            .padding(20)
            .frame(maxWidth: 700)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle(product?.name ?? "Produit")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { isEditing = true } label: {
                    Image(systemName: "square.and.pencil").font(.system(size: 17))
                }
            }
        }
        .sheet(isPresented: $isEditing) {
            if let product {
                ProductFormSheet(store: store, product: product) { await reload() }
            }
        }
        .sheet(isPresented: $isManagingVariants) {
            if let product {
                VariantsSheet(product: product, variants: variants) { await reload() }
            }
        }
        .alert("Supprimer ce produit ?", isPresented: $isDeleting) {
            Button("Annuler", role: .cancel) {}
            Button("Supprimer", role: .destructive) {
                Task {
                    if await CatalogService.deleteProduct(id: productId) {
                        await store.load()
                        dismiss()
                    }
                }
            }
        } message: {
            Text("Le produit, ses variantes et ses liens avec les demandes seront supprimés.")
        }
        .onChange(of: pickedPhoto) { _, item in
            guard let item else { return }
            Task { await upload(item) }
        }
        .task { await reload() }
        .refreshable { await reload() }
    }

    // MARK: Sections

    @ViewBuilder
    private func gallery(_ product: CatalogProduct) -> some View {
        let images = product.allImages

        VStack(spacing: 10) {
            if images.isEmpty {
                RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                    .fill(Theme.surface)
                    .frame(height: 200)
                    .overlay {
                        VStack(spacing: 8) {
                            Image(systemName: "photo.badge.plus")
                                .font(.system(size: 32, weight: .light))
                                .foregroundStyle(Theme.mutedForeground)
                            Text("Aucune image")
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(images, id: \.self) { url in
                            AsyncImage(url: URL(string: url)) { image in
                                image.resizable().scaledToFit()
                            } placeholder: {
                                ProgressView().controlSize(.small)
                            }
                            .frame(width: 200, height: 200)
                            .background(
                                RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                                    .fill(Theme.surface)
                            )
                            .overlay(alignment: .topTrailing) {
                                Button {
                                    Task { await removeImage(url) }
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .font(.system(size: 18))
                                        .foregroundStyle(.white, Theme.destructive)
                                }
                                .buttonStyle(.plain)
                                .padding(8)
                            }
                            .overlay(alignment: .bottomLeading) {
                                if url == product.imageURL {
                                    Tag(label: "Principale", tint: Theme.primary)
                                        .padding(8)
                                }
                            }
                        }
                    }
                }
            }

            PhotosPicker(selection: $pickedPhoto, matching: .images) {
                HStack(spacing: 7) {
                    if isUploading {
                        ProgressView().controlSize(.small)
                    } else {
                        Image(systemName: "photo.badge.plus").font(.system(size: 14, weight: .semibold))
                    }
                    Text(images.isEmpty ? "Ajouter une image" : "Ajouter une autre image")
                        .font(.system(size: 15, weight: .medium))
                }
                .foregroundStyle(Theme.primary)
                .frame(maxWidth: .infinity)
                .frame(height: 46)
                .background(
                    RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                        .fill(Theme.primary.opacity(0.12))
                )
            }
            .disabled(isUploading)
        }
    }

    private func identity(_ product: CatalogProduct) -> some View {
        Card {
            VStack(spacing: 0) {
                DetailRow(label: "Nom", value: product.name)
                if let brand = product.brandName {
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Marque", value: brand)
                }
                if let category = product.categoryName {
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Catégorie", value: category)
                }
                if let model = product.model, !model.isEmpty {
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Modèle", value: model)
                }
                if let sku = product.sku, !sku.isEmpty {
                    Divider().overlay(Theme.border)
                    DetailRow(label: "SKU", value: sku)
                }
                if let stock = product.stock {
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Stock", value: "\(stock)")
                }
                Divider().overlay(Theme.border)
                DetailRow(label: "Statut", value: product.isActive ? "Actif" : "Inactif")
                if product.adminOnly {
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Visibilité", value: "Administrateurs seulement")
                }
            }
        }
    }

    @ViewBuilder
    private func pricing(_ product: CatalogProduct) -> some View {
        Card {
            VStack(spacing: 0) {
                DetailRow(label: "Prix d'achat", value: Format.currency(product.price), emphasis: true)
                if let monthly = product.monthlyPrice, monthly > 0 {
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Mensualité", value: Format.currency(monthly))
                }
            }
        }

        if let description = product.shortDescription ?? product.description, !description.isEmpty {
            Card {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Description")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                    Text(description)
                        .font(.system(size: 14))
                        .foregroundStyle(Theme.mutedForeground)
                }
            }
        }
    }

    private func specifications(_ product: CatalogProduct) -> some View {
        Card {
            VStack(alignment: .leading, spacing: 10) {
                Text("Caractéristiques")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Theme.foreground)

                VStack(spacing: 0) {
                    let keys = product.specifications.keys.sorted()
                    ForEach(Array(keys.enumerated()), id: \.element) { index, key in
                        if index > 0 { Divider().overlay(Theme.border) }
                        DetailRow(label: key, value: product.specifications[key] ?? "")
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func variantsSection(_ product: CatalogProduct) -> some View {
        SectionHeader(title: "Variantes", count: variants.count)

        if !product.variationAttributes.isEmpty {
            Card {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Axes de variation")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Theme.mutedForeground)
                    ForEach(product.variationAttributes.keys.sorted(), id: \.self) { key in
                        HStack(alignment: .top, spacing: 6) {
                            Text("\(key) :")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Theme.foreground)
                            Text((product.variationAttributes[key] ?? []).joined(separator: ", "))
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }
                }
            }
        }

        ForEach(variants) { variant in
            Card {
                HStack {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(variant.label.isEmpty ? "Variante" : variant.label)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(Theme.foreground)
                        if let monthly = variant.monthlyPrice, monthly > 0 {
                            Text("\(Format.currency(monthly))/mois")
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.primary)
                        }
                    }
                    Spacer()
                    Text(Format.currency(variant.price))
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                }
            }
        }

        TertiaryButton(title: "Gérer les variantes", systemImage: "slider.horizontal.3") {
            isManagingVariants = true
        }
    }

    private func actions(_ product: CatalogProduct) -> some View {
        VStack(spacing: 8) {
            SectionHeader(title: "Actions")

            ActionRow(
                icon: "doc.on.doc.fill",
                tint: Theme.teal,
                title: "Dupliquer le produit",
                subtitle: "Copie avec ses variantes"
            ) {
                Task {
                    if await CatalogService.duplicateProduct(product) != nil {
                        message = "Produit dupliqué."
                        await store.load()
                    } else {
                        errorMessage = "Duplication impossible."
                    }
                }
            }

            ActionRow(
                icon: product.isActive ? "eye.slash.fill" : "eye.fill",
                tint: product.isActive ? Theme.mutedForeground : Theme.emerald,
                title: product.isActive ? "Désactiver" : "Activer",
                subtitle: product.isActive
                    ? "Le produit sortira du catalogue"
                    : "Le produit redeviendra proposable"
            ) {
                Task {
                    var input = CatalogService.ProductInput()
                    apply(product, to: &input)
                    input.isActive.toggle()
                    if await CatalogService.updateProduct(id: product.id, input) {
                        await reload()
                    }
                }
            }

            ActionRow(
                icon: "trash.fill",
                tint: Theme.destructive,
                title: "Supprimer le produit",
                subtitle: "Action définitive"
            ) { isDeleting = true }
        }
    }

    // MARK: Données

    private func reload() async {
        isLoading = true
        defer { isLoading = false }
        product = await CatalogService.product(id: productId)
        variants = await CatalogService.variants(productId: productId)
    }

    private func upload(_ item: PhotosPickerItem) async {
        guard let product else { return }
        isUploading = true
        defer { isUploading = false; pickedPhoto = nil }

        guard let data = try? await item.loadTransferable(type: Data.self) else {
            errorMessage = "Image illisible."
            return
        }

        // Recompression : une photo d'iPhone pèse plusieurs mégaoctets, ce qui
        // ralentirait le catalogue pour rien.
        let payload = UIImage(data: data)?.jpegData(compressionQuality: 0.8) ?? data

        if await CatalogService.uploadImage(
            productId: product.id,
            data: payload,
            isMain: product.allImages.isEmpty,
            existing: product
        ) {
            message = "Image ajoutée."
            await reload()
        } else {
            errorMessage = "Téléversement impossible."
        }
    }

    private func removeImage(_ url: String) async {
        guard let product else { return }
        if await CatalogService.removeImage(product: product, url: url) {
            await reload()
        }
    }

    /// Recopie une fiche existante dans une saisie, pour n'en modifier qu'un
    /// champ sans écraser le reste.
    private func apply(_ product: CatalogProduct, to input: inout CatalogService.ProductInput) {
        input.name = product.name
        input.brandId = product.brandId
        input.categoryId = product.categoryId
        input.description = product.description ?? ""
        input.shortDescription = product.shortDescription ?? ""
        input.price = product.price
        input.monthlyPrice = product.monthlyPrice
        input.model = product.model ?? ""
        input.sku = product.sku ?? ""
        input.stock = product.stock
        input.isActive = product.isActive
        input.adminOnly = product.adminOnly
        input.specifications = product.specifications
    }
}
