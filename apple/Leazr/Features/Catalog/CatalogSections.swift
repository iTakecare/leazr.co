import Foundation
import Observation
import SwiftUI
import Supabase

// MARK: - Packs

/// Packs produits : composition, prix de vente et promotion.
struct PacksSection: View {

    @Bindable var store: CatalogStore
    @State private var editing: ProductPack?
    @State private var isCreating = false

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                if store.packs.isEmpty {
                    EmptyHint(icon: "square.stack.3d.up", label: "Aucun pack")
                }

                ForEach(store.packs) { pack in
                    NavigationLink {
                        PackDetailView(pack: pack) { await store.load() }
                    } label: {
                        PackRow(pack: pack)
                    }
                    .buttonStyle(PressableStyle())
                }

                TertiaryButton(title: "Créer un pack", systemImage: "plus.circle") {
                    isCreating = true
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
        .sheet(isPresented: $isCreating) {
            PackFormSheet(pack: nil) { await store.load() }
        }
    }
}

struct PackRow: View {
    let pack: ProductPack

    var body: some View {
        Card {
            HStack(spacing: 12) {
                AsyncImage(url: pack.imageURL.flatMap(URL.init)) { image in
                    image.resizable().scaledToFit()
                } placeholder: {
                    Image(systemName: "square.stack.3d.up.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(Theme.mutedForeground)
                }
                .frame(width: 48, height: 48)
                .background(
                    RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Theme.background)
                )

                VStack(alignment: .leading, spacing: 3) {
                    Text(pack.name)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                        .lineLimit(2)

                    HStack(spacing: 6) {
                        if !pack.isActive { Tag(label: "Inactif", tint: Theme.mutedForeground) }
                        if pack.isFeatured { Tag(label: "Mis en avant", tint: Theme.amber) }
                        if pack.promoActive { Tag(label: "Promo", tint: Theme.rose) }
                    }
                }

                Spacer(minLength: 4)

                VStack(alignment: .trailing, spacing: 3) {
                    Text("\(Format.currency(pack.effectiveMonthlyPrice))/mois")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(Theme.primary)
                    if pack.totalMargin > 0 {
                        Text("Marge \(Format.currency(pack.totalMargin))")
                            .font(.system(size: 11))
                            .foregroundStyle(Theme.mutedForeground)
                    }
                }
            }
        }
    }
}

struct PackDetailView: View {

    let pack: ProductPack
    let onChanged: () async -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var items: [ProductPackItem] = []
    @State private var isEditing = false
    @State private var isDeleting = false

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                HighlightCard(
                    label: "Mensualité du pack",
                    value: Format.currency(pack.effectiveMonthlyPrice),
                    tint: pack.promoActive ? Theme.rose : Theme.primary
                )

                Card {
                    VStack(spacing: 0) {
                        DetailRow(label: "Prix d'achat total", value: Format.currency(pack.totalPurchasePrice))
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Somme des lignes", value: Format.currency(pack.totalMonthlyPrice))
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Marge", value: Format.currency(pack.totalMargin), emphasis: true)
                        if let duration = pack.selectedDuration {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Durée", value: "\(duration) mois")
                        }
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Statut", value: pack.isActive ? "Actif" : "Inactif")
                    }
                }

                if let description = pack.description, !description.isEmpty {
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

                SectionHeader(title: "Composition", count: items.count)

                if items.isEmpty {
                    EmptyHint(icon: "shippingbox", label: "Aucun produit dans ce pack")
                }

                ForEach(items) { item in
                    Card {
                        HStack(spacing: 12) {
                            AsyncImage(url: item.product?.imageURL.flatMap(URL.init)) { image in
                                image.resizable().scaledToFit()
                            } placeholder: {
                                Image(systemName: "shippingbox.fill")
                                    .font(.system(size: 15))
                                    .foregroundStyle(Theme.mutedForeground)
                            }
                            .frame(width: 40, height: 40)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.product?.name ?? "Produit")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(Theme.foreground)
                                    .lineLimit(2)
                                Text("×\(item.quantity) · marge \(Int(item.marginPercentage)) %")
                                    .font(.system(size: 12))
                                    .foregroundStyle(Theme.mutedForeground)
                            }

                            Spacer(minLength: 4)

                            Text("\(Format.currency(item.unitMonthlyPrice))/mois")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(Theme.primary)
                        }
                    }
                }

                ActionRow(
                    icon: "square.and.pencil",
                    tint: Theme.primary,
                    title: "Modifier le pack",
                    subtitle: "Nom, prix, promotion"
                ) { isEditing = true }

                ActionRow(
                    icon: "trash.fill",
                    tint: Theme.destructive,
                    title: "Supprimer le pack",
                    subtitle: "Action définitive"
                ) { isDeleting = true }
            }
            .padding(20)
            .frame(maxWidth: 700)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle(pack.name)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $isEditing) {
            PackFormSheet(pack: pack) { await onChanged() }
        }
        .alert("Supprimer ce pack ?", isPresented: $isDeleting) {
            Button("Annuler", role: .cancel) {}
            Button("Supprimer", role: .destructive) {
                Task {
                    if await CatalogService.deletePack(id: pack.id) {
                        await onChanged()
                        dismiss()
                    }
                }
            }
        }
        .task { items = await CatalogService.packItems(packId: pack.id) }
    }
}

struct PackFormSheet: View {

    @Environment(\.dismiss) private var dismiss

    let pack: ProductPack?
    let onSaved: () async -> Void

    @State private var name = ""
    @State private var description = ""
    @State private var monthlyText = ""
    @State private var promoText = ""
    @State private var isActive = true
    @State private var isFeatured = false
    @State private var adminOnly = false
    @State private var promoActive = false
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage { ErrorBanner(message: errorMessage) }

                    FormSection(title: "Nom du pack") {
                        LeazrField(
                            icon: "square.stack.3d.up",
                            placeholder: "Ex. Pack Bureau Complet",
                            text: $name,
                            autocapitalization: .words
                        )
                    }

                    FormSection(title: "Description") {
                        LeazrTextArea(placeholder: "Ce que contient le pack", text: $description)
                    }

                    FormSection(title: "Mensualité du pack (€)") {
                        LeazrField(
                            icon: "eurosign.circle",
                            placeholder: "Laisser vide pour la somme des lignes",
                            text: $monthlyText,
                            keyboardType: .decimalPad
                        )
                    }

                    FormSection(title: "Promotion") {
                        VStack(spacing: 10) {
                            Toggle("Promotion active", isOn: $promoActive)
                                .tint(Theme.rose)
                                .font(.system(size: 15))
                                .padding(.horizontal, 16)
                                .frame(height: 52)
                                .background(
                                    RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                        .fill(Theme.surface)
                                )
                            if promoActive {
                                LeazrField(
                                    icon: "tag",
                                    placeholder: "Prix promotionnel",
                                    text: $promoText,
                                    keyboardType: .decimalPad
                                )
                            }
                        }
                    }

                    FormSection(title: "Visibilité") {
                        VStack(spacing: 10) {
                            Toggle("Pack actif", isOn: $isActive)
                                .tint(Theme.primary)
                                .font(.system(size: 15))
                                .padding(.horizontal, 16)
                                .frame(height: 52)
                                .background(
                                    RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                        .fill(Theme.surface)
                                )
                            Toggle("Mis en avant", isOn: $isFeatured)
                                .tint(Theme.amber)
                                .font(.system(size: 15))
                                .padding(.horizontal, 16)
                                .frame(height: 52)
                                .background(
                                    RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                        .fill(Theme.surface)
                                )
                            Toggle("Administrateurs seulement", isOn: $adminOnly)
                                .tint(Theme.violet)
                                .font(.system(size: 15))
                                .padding(.horizontal, 16)
                                .frame(height: 52)
                                .background(
                                    RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                        .fill(Theme.surface)
                                )
                        }
                    }

                    Text("La composition du pack se modifie depuis le web : elle demande de choisir des produits et leurs variantes ligne par ligne.")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    PrimaryButton(
                        title: pack == nil ? "Créer le pack" : "Enregistrer",
                        systemImage: pack == nil ? "plus.circle.fill" : "checkmark.circle.fill",
                        isLoading: isSaving,
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
            .navigationTitle(pack == nil ? "Nouveau pack" : "Modifier le pack")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .onAppear {
                guard let pack else { return }
                name = pack.name
                description = pack.description ?? ""
                if let price = pack.packMonthlyPrice { monthlyText = String(format: "%.2f", price) }
                if let promo = pack.packPromoPrice { promoText = String(format: "%.2f", promo) }
                isActive = pack.isActive
                isFeatured = pack.isFeatured
                adminOnly = pack.adminOnly
                promoActive = pack.promoActive
            }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        let ok = await CatalogService.savePack(
            id: pack?.id,
            name: name,
            description: description,
            isActive: isActive,
            isFeatured: isFeatured,
            adminOnly: adminOnly,
            monthlyPrice: Double(monthlyText.replacingOccurrences(of: ",", with: ".")),
            promoPrice: Double(promoText.replacingOccurrences(of: ",", with: ".")),
            promoActive: promoActive
        )

        if ok {
            await onSaved()
            dismiss()
        } else {
            errorMessage = "Enregistrement impossible."
        }
    }
}

// MARK: - Marques et catégories

struct TaxonomySection: View {

    @Bindable var store: CatalogStore
    @State private var editing: TermEdit?

    struct TermEdit: Identifiable {
        let id = UUID()
        let table: String
        let title: String
        let term: CatalogTerm?
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                SectionHeader(title: "Marques", count: store.brands.count)

                ForEach(store.brands) { brand in
                    TermRow(term: brand) {
                        editing = TermEdit(table: "brands", title: "Marque", term: brand)
                    } onDelete: {
                        Task {
                            _ = await CatalogService.deleteTerm(table: "brands", id: brand.id)
                            await store.load()
                        }
                    }
                }

                TertiaryButton(title: "Ajouter une marque", systemImage: "plus.circle") {
                    editing = TermEdit(table: "brands", title: "Marque", term: nil)
                }

                SectionHeader(title: "Catégories", count: store.categories.count)

                ForEach(store.categories) { category in
                    TermRow(term: category) {
                        editing = TermEdit(table: "categories", title: "Catégorie", term: category)
                    } onDelete: {
                        Task {
                            _ = await CatalogService.deleteTerm(table: "categories", id: category.id)
                            await store.load()
                        }
                    }
                }

                TertiaryButton(title: "Ajouter une catégorie", systemImage: "plus.circle") {
                    editing = TermEdit(table: "categories", title: "Catégorie", term: nil)
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
        .sheet(item: $editing) { edit in
            TermFormSheet(table: edit.table, title: edit.title, term: edit.term) {
                await store.load()
            }
            .presentationDetents([.height(400)])
        }
    }
}

struct TermRow: View {
    let term: CatalogTerm
    let onEdit: () -> Void
    let onDelete: () -> Void

    var body: some View {
        Card {
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(term.label)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                    // Le nom technique sert aux rapprochements d'import : il
                    // reste visible quand il diffère du libellé affiché.
                    if term.label != term.name {
                        Text(term.name)
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.mutedForeground)
                    }
                }

                Spacer(minLength: 4)

                Button(action: onEdit) {
                    Image(systemName: "square.and.pencil")
                        .font(.system(size: 14))
                        .foregroundStyle(Theme.primary)
                }
                .buttonStyle(.plain)

                Button(role: .destructive, action: onDelete) {
                    Image(systemName: "trash")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.destructive)
                }
                .buttonStyle(.plain)
            }
        }
    }
}

struct TermFormSheet: View {

    @Environment(\.dismiss) private var dismiss

    let table: String
    let title: String
    let term: CatalogTerm?
    let onSaved: () async -> Void

    @State private var name = ""
    @State private var translation = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage { ErrorBanner(message: errorMessage) }

                    FormSection(title: "Nom technique") {
                        LeazrField(
                            icon: "tag",
                            placeholder: "Ex. apple",
                            text: $name
                        )
                    }

                    FormSection(title: "Libellé affiché") {
                        LeazrField(
                            icon: "text.alignleft",
                            placeholder: "Ex. Apple",
                            text: $translation,
                            autocapitalization: .words
                        )
                    }

                    PrimaryButton(
                        title: term == nil ? "Créer" : "Enregistrer",
                        systemImage: "checkmark.circle.fill",
                        isLoading: isSaving,
                        isEnabled: !name.trimmingCharacters(in: .whitespaces).isEmpty
                    ) {
                        Task { await save() }
                    }
                }
                .padding(20)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle(term == nil ? "Nouvelle \(title.lowercased())" : title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .onAppear {
                name = term?.name ?? ""
                translation = term?.translation ?? ""
            }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        let ok = await CatalogService.saveTerm(
            table: table,
            id: term?.id,
            name: name,
            translation: translation
        )
        if ok {
            await onSaved()
            dismiss()
        } else {
            errorMessage = "Enregistrement impossible."
        }
    }
}

// MARK: - Impact environnemental

/// Économies de CO₂ par catégorie, affichées sur le catalogue public.
struct EnvironmentSection: View {

    let companyId: String?

    @State private var categories: [EnvironmentalCategory] = []
    @State private var editing: EnvironmentalCategory?
    @State private var isLoading = false

    private var total: Double {
        categories.compactMap(\.co2SavingsKg).reduce(0, +)
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                if categories.isEmpty && !isLoading {
                    EmptyHint(icon: "leaf", label: "Aucune catégorie")
                }

                if total > 0 {
                    Card {
                        HStack(spacing: 12) {
                            Image(systemName: "leaf.fill")
                                .font(.system(size: 20))
                                .foregroundStyle(Theme.emerald)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("CO₂ évité, toutes catégories")
                                    .font(.system(size: 13))
                                    .foregroundStyle(Theme.mutedForeground)
                                Text(String(format: "%.0f kg", total))
                                    .font(.system(size: 20, weight: .bold))
                                    .foregroundStyle(Theme.emerald)
                            }
                            Spacer()
                        }
                    }
                }

                ForEach(categories) { category in
                    Button {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        editing = category
                    } label: {
                        Card {
                            HStack {
                                Text(category.label)
                                    .font(.system(size: 15, weight: .medium))
                                    .foregroundStyle(Theme.foreground)
                                Spacer()
                                if let savings = category.co2SavingsKg, savings > 0 {
                                    Text(String(format: "%.0f kg CO₂", savings))
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(Theme.emerald)
                                } else {
                                    Text("Non renseigné")
                                        .font(.system(size: 13))
                                        .foregroundStyle(Theme.mutedForeground)
                                }
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(Theme.mutedForeground)
                            }
                        }
                    }
                    .buttonStyle(PressableStyle())
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
        .sheet(item: $editing) { category in
            CO2Sheet(category: category) { await load() }
                .presentationDetents([.height(340)])
        }
        .task { await load() }
    }

    private func load() async {
        guard let companyId else { return }
        isLoading = true
        defer { isLoading = false }
        categories = await CatalogService.environmentalCategories(companyId: companyId)
    }
}

struct CO2Sheet: View {

    @Environment(\.dismiss) private var dismiss

    let category: EnvironmentalCategory
    let onSaved: () async -> Void

    @State private var value = ""
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    FormSection(title: "CO₂ évité par unité (kg)") {
                        LeazrField(
                            icon: "leaf",
                            placeholder: "0",
                            text: $value,
                            keyboardType: .decimalPad
                        )
                    }

                    Text("Cette valeur alimente l'argumentaire environnemental du catalogue public.")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    PrimaryButton(
                        title: "Enregistrer",
                        systemImage: "checkmark.circle.fill",
                        isLoading: isSaving
                    ) {
                        Task {
                            isSaving = true
                            let ok = await CatalogService.setCategoryCO2(
                                categoryId: category.id,
                                savings: Double(value.replacingOccurrences(of: ",", with: "."))
                            )
                            isSaving = false
                            if ok {
                                await onSaved()
                                dismiss()
                            }
                        }
                    }
                }
                .padding(20)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle(category.label)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .onAppear {
                if let savings = category.co2SavingsKg { value = String(format: "%.0f", savings) }
            }
        }
    }
}
