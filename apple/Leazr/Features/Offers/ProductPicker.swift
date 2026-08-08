import Foundation
import Observation
import SwiftUI
import Supabase

/// Sélection d'un produit du catalogue, avec quantité et marge.
///
/// C'est le cœur de la création d'offre : le web part du catalogue, pas d'une
/// saisie libre. Reprendre ce point d'entrée garantit des prix d'achat justes
/// et donc une marge fiable.
struct ProductPicker: View {

    @Environment(\.dismiss) private var dismiss
    let onAdd: (DraftEquipment) -> Void

    @State private var store = ListStore<Product>(
        table: "products",
        columns: "id, name, price, monthly_price, brand_name, category_name, image_url",
        orderBy: "name",
        pageSize: 400,
        searchColumns: ["name", "brand_name", "category_name"],
        matches: { p, q in
            p.name.lowercased().contains(q)
                || (p.brandName?.lowercased().contains(q) ?? false)
        }
    )
    @State private var selected: Product?

    var body: some View {
        NavigationStack {
            Group {
                if store.items.isEmpty && store.isLoading {
                    ProgressView().tint(Theme.mutedForeground)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 10) {
                            ForEach(store.filtered) { product in
                                Button {
                                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                    selected = product
                                } label: {
                                    Card {
                                        HStack(spacing: 12) {
                                            AsyncImage(url: product.imageURL.flatMap(URL.init)) { image in
                                                image.resizable().scaledToFit()
                                            } placeholder: {
                                                Image(systemName: "shippingbox.fill")
                                                    .foregroundStyle(Theme.mutedForeground)
                                            }
                                            .frame(width: 46, height: 46)

                                            VStack(alignment: .leading, spacing: 3) {
                                                Text(product.name)
                                                    .font(.system(size: 15, weight: .semibold))
                                                    .foregroundStyle(Theme.foreground)
                                                    .lineLimit(2)
                                                if let brand = product.brandName {
                                                    Text(brand)
                                                        .font(.system(size: 13))
                                                        .foregroundStyle(Theme.mutedForeground)
                                                }
                                            }

                                            Spacer(minLength: 8)

                                            Text(Format.currency(product.price))
                                                .font(.system(size: 15, weight: .semibold))
                                                .foregroundStyle(Theme.foreground)
                                        }
                                    }
                                }
                                .buttonStyle(PressableStyle())
                            }
                        }
                        .padding(20)
                        .frame(maxWidth: 640)
                        .frame(maxWidth: .infinity)
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Catalogue")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: Bindable(store).search, prompt: "Produit ou marque")
            .task { if store.items.isEmpty { await store.load() } }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Annuler") { dismiss() }
                }
            }
            .sheet(item: $selected) { product in
                EquipmentConfigSheet(product: product) { draft in
                    onAdd(draft)
                    dismiss()
                }
                .presentationDetents([.height(430)])
            }
        }
    }
}

/// Quantité et marge du produit choisi, avec la mensualité qui se recalcule
/// à chaque ajustement.
struct EquipmentConfigSheet: View {

    @Environment(\.dismiss) private var dismiss
    let product: Product
    let onConfirm: (DraftEquipment) -> Void

    @State private var quantity = 1
    @State private var margin: Double = 20

    private var financed: Double {
        Financing.financedAmount(purchasePrice: product.price, marginPercent: margin) * Double(quantity)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    Card {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(product.name)
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(Theme.foreground)
                            Text("Prix d'achat : \(Format.currency(product.price))")
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }

                    FormSection(title: "Quantité") {
                        Stepper("\(quantity)", value: $quantity, in: 1...50)
                            .padding(.horizontal, 16)
                            .frame(height: 50)
                            .background(
                                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                    .fill(Theme.surface)
                            )
                    }

                    FormSection(title: "Marge : \(Int(margin)) %") {
                        Slider(value: $margin, in: 0...60, step: 1)
                            .tint(Theme.primary)
                    }

                    Card {
                        VStack(spacing: 0) {
                            DetailRow(label: "Montant financé", value: Format.currency(financed), emphasis: true)
                        }
                    }

                    PrimaryButton(title: "Ajouter", systemImage: "plus") {
                        onConfirm(
                            DraftEquipment(
                                title: product.name,
                                purchasePrice: product.price,
                                quantity: quantity,
                                margin: margin
                            )
                        )
                        dismiss()
                    }
                }
                .padding(20)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Configurer")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
