import Foundation
import Observation
import SwiftUI
import Supabase

@MainActor
@Observable
final class CatalogStore {

    private(set) var products: [CatalogProduct] = []
    private(set) var brands: [CatalogTerm] = []
    private(set) var categories: [CatalogTerm] = []
    private(set) var packs: [ProductPack] = []
    private(set) var isLoading = false
    private(set) var companyId: String?
    var errorMessage: String?

    var search = ""
    var brandFilter: String = "all"
    var categoryFilter: String = "all"
    var showInactive = false

    func load() async {
        isLoading = true
        defer { isLoading = false }

        guard let companyId = await Session.shared.resolve() else {
            errorMessage = "Société introuvable."
            return
        }
        self.companyId = companyId

        async let productsTask = CatalogService.products(companyId: companyId)
        async let brandsTask = CatalogService.brands(companyId: companyId)
        async let categoriesTask = CatalogService.categories(companyId: companyId)
        async let packsTask = CatalogService.packs(companyId: companyId)

        products = await productsTask
        brands = await brandsTask
        categories = await categoriesTask
        packs = await packsTask
        errorMessage = nil
    }

    var filtered: [CatalogProduct] {
        // Les variantes enfant ne sont pas des produits du catalogue : elles
        // appartiennent à leur parent et le pollueraient.
        var result = products.filter { $0.parentId == nil }

        if !showInactive {
            result = result.filter(\.isActive)
        }
        if brandFilter != "all" {
            result = result.filter { $0.brandName == brandFilter }
        }
        if categoryFilter != "all" {
            result = result.filter { $0.categoryName == categoryFilter }
        }

        if !search.isEmpty {
            let q = search.lowercased()
            result = result.filter {
                $0.name.lowercased().contains(q)
                    || ($0.brandName?.lowercased().contains(q) ?? false)
                    || ($0.categoryName?.lowercased().contains(q) ?? false)
                    || ($0.sku?.lowercased().contains(q) ?? false)
            }
        }

        return result
    }

    var hasFilter: Bool {
        brandFilter != "all" || categoryFilter != "all" || showInactive
    }

    func resetFilters() {
        brandFilter = "all"
        categoryFilter = "all"
        showInactive = false
    }

    var brandNames: [String] {
        Array(Set(products.compactMap(\.brandName))).sorted()
    }

    var categoryNames: [String] {
        Array(Set(products.compactMap(\.categoryName))).sorted()
    }
}

// MARK: - Écran

struct CatalogView: View {

    /// Poussé depuis « Plus » : la pile de navigation existe déjà.
    var embedded = false

    @State private var store = CatalogStore()
    @State private var section: Section = .products
    @State private var isCreating = false
    @State private var isFiltering = false
    @State private var exportURL: URL?

    enum Section: String, CaseIterable, Identifiable {
        case products = "Produits"
        case packs = "Packs"
        case taxonomy = "Marques"
        case environment = "Impact"

        var id: String { rawValue }

        var icon: String {
            switch self {
            case .products:    return "shippingbox.fill"
            case .packs:       return "square.stack.3d.up.fill"
            case .taxonomy:    return "tag.fill"
            case .environment: return "leaf.fill"
            }
        }
    }

    var body: some View {
        if embedded { content } else { NavigationStack { content } }
    }

    private var content: some View {
        VStack(spacing: 0) {
            sectionBar

            Group {
                switch section {
                case .products:    productsSection
                case .packs:       PacksSection(store: store)
                case .taxonomy:    TaxonomySection(store: store)
                case .environment: EnvironmentSection(companyId: store.companyId)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("Catalogue")
        .navigationBarTitleDisplayMode(embedded ? .inline : .large)
        .toolbar {
            if !embedded { ProfileMenu() }
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button { isCreating = true } label: {
                    Image(systemName: "plus.circle.fill").font(.system(size: 20))
                }
                Menu {
                    Button { isFiltering = true } label: {
                        Label("Filtrer", systemImage: "line.3.horizontal.decrease.circle")
                    }
                    Button {
                        exportURL = CatalogService.exportCSV(store.filtered)
                    } label: {
                        Label("Exporter le catalogue (CSV)", systemImage: "square.and.arrow.up")
                    }
                } label: {
                    Image(systemName: store.hasFilter
                        ? "line.3.horizontal.decrease.circle.fill"
                        : "ellipsis.circle")
                        .font(.system(size: 19))
                }
            }
        }
        .sheet(isPresented: $isCreating) {
            ProductFormSheet(store: store, product: nil) { await store.load() }
        }
        .sheet(isPresented: $isFiltering) {
            CatalogFilterSheet(store: store)
                .presentationDetents([.medium, .large])
        }
        .sheet(item: Binding(
            get: { exportURL.map(ExportFile.init) },
            set: { if $0 == nil { exportURL = nil } }
        )) { file in
            ShareSheet(url: file.url).presentationDetents([.medium])
        }
        .searchable(text: Bindable(store).search, prompt: "Produit, marque, catégorie ou SKU")
        .refreshable { await store.load() }
        .task { if store.products.isEmpty { await store.load() } }
    }

    private var sectionBar: some View {
        VStack(spacing: 10) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 7) {
                    ForEach(Section.allCases) { item in
                        let isActive = section == item
                        Button {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            withAnimation(.easeOut(duration: 0.16)) { section = item }
                        } label: {
                            HStack(spacing: 5) {
                                Image(systemName: item.icon).font(.system(size: 11, weight: .semibold))
                                Text(item.rawValue).font(.system(size: 13, weight: .semibold))
                            }
                            .foregroundStyle(isActive ? .white : Theme.mutedForeground)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Capsule().fill(isActive ? Theme.primary : Theme.surface))
                        }
                        .buttonStyle(PressableStyle())
                    }
                }
                .padding(.horizontal, 20)
            }

            if section == .products, !store.filtered.isEmpty {
                HStack {
                    Text("\(store.filtered.count) produit\(store.filtered.count > 1 ? "s" : "")")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.mutedForeground)
                    Spacer()
                }
                .padding(.horizontal, 20)
            }
        }
        .padding(.vertical, 10)
    }

    @ViewBuilder
    private var productsSection: some View {
        if store.products.isEmpty && store.isLoading {
            ProgressView().tint(Theme.mutedForeground)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if store.filtered.isEmpty {
            VStack(spacing: 14) {
                if let error = store.errorMessage {
                    ErrorBanner(message: error).padding(.horizontal, 20)
                }
                EmptyHint(icon: "shippingbox", label: "Aucun produit")
                if store.hasFilter {
                    Button("Réinitialiser les filtres") { store.resetFilters() }
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Theme.primary)
                }
            }
        } else {
            ScrollView {
                LazyVStack(spacing: 10) {
                    ForEach(store.filtered) { product in
                        NavigationLink {
                            ProductDetailView(productId: product.id, store: store)
                        } label: {
                            CatalogProductRow(product: product)
                        }
                        .buttonStyle(PressableStyle())
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
        }
    }
}

// MARK: - Ligne produit

struct CatalogProductRow: View {
    let product: CatalogProduct

    var body: some View {
        Card {
            HStack(spacing: 12) {
                AsyncImage(url: product.imageURL.flatMap(URL.init)) { image in
                    image.resizable().scaledToFit()
                } placeholder: {
                    Image(systemName: "shippingbox.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(Theme.mutedForeground)
                }
                .frame(width: 52, height: 52)
                .background(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(Theme.background)
                )

                VStack(alignment: .leading, spacing: 3) {
                    Text(product.name)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                        .multilineTextAlignment(.leading)
                        .lineLimit(2)

                    HStack(spacing: 6) {
                        if let brand = product.brandName {
                            Text(brand)
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                        if let category = product.categoryName {
                            Text("· \(category)")
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }

                    HStack(spacing: 6) {
                        if !product.isActive {
                            Tag(label: "Inactif", tint: Theme.mutedForeground)
                        }
                        if product.adminOnly {
                            Tag(label: "Admin", tint: Theme.violet)
                        }
                        if product.isParent {
                            Tag(label: "Variantes", tint: Theme.sky)
                        }
                    }
                }

                Spacer(minLength: 4)

                VStack(alignment: .trailing, spacing: 3) {
                    Text(Format.currency(product.price))
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                    if let monthly = product.monthlyPrice, monthly > 0 {
                        Text("\(Format.currency(monthly))/mois")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Theme.primary)
                    }
                }
            }
        }
    }
}

/// Petite étiquette d'état, réutilisée dans le catalogue.
struct Tag: View {
    let label: String
    let tint: Color

    var body: some View {
        Text(label)
            .font(.system(size: 10, weight: .bold))
            .foregroundStyle(tint)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Capsule().fill(tint.opacity(0.15)))
    }
}

// MARK: - Filtres

struct CatalogFilterSheet: View {

    @Environment(\.dismiss) private var dismiss
    @Bindable var store: CatalogStore

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    FormSection(title: "Marque") {
                        VStack(spacing: 8) {
                            MotifChoiceRow(label: "Toutes", isSelected: store.brandFilter == "all") {
                                store.brandFilter = "all"
                            }
                            ForEach(store.brandNames, id: \.self) { name in
                                MotifChoiceRow(label: name, isSelected: store.brandFilter == name) {
                                    store.brandFilter = name
                                }
                            }
                        }
                    }

                    FormSection(title: "Catégorie") {
                        VStack(spacing: 8) {
                            MotifChoiceRow(label: "Toutes", isSelected: store.categoryFilter == "all") {
                                store.categoryFilter = "all"
                            }
                            ForEach(store.categoryNames, id: \.self) { name in
                                MotifChoiceRow(label: name, isSelected: store.categoryFilter == name) {
                                    store.categoryFilter = name
                                }
                            }
                        }
                    }

                    Toggle("Afficher les produits inactifs", isOn: Bindable(store).showInactive)
                        .tint(Theme.primary)
                        .font(.system(size: 15))
                        .padding(.horizontal, 16)
                        .frame(height: 52)
                        .background(
                            RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                .fill(Theme.surface)
                        )

                    TertiaryButton(title: "Tout réinitialiser", systemImage: "arrow.counterclockwise") {
                        store.resetFilters()
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Filtrer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Terminé") { dismiss() }.fontWeight(.semibold)
                }
            }
        }
    }
}
