import SwiftUI

// MARK: - Clients

struct ClientsView: View {
    @State private var store = ListStore<Client>(
        table: "clients",
        columns: Client.columns,
        pageSize: 500,
        searchColumns: ["name", "company", "email", "contact_name", "vat_number"],
        matches: { c, q in
            c.name.lowercased().contains(q)
                || (c.email?.lowercased().contains(q) ?? false)
                || (c.company?.lowercased().contains(q) ?? false)
                || (c.contactName?.lowercased().contains(q) ?? false)
        }
    )

    @State private var isCreating = false

    var body: some View {
        ListScreen(
            title: "Clients",
            searchPrompt: "Nom, société ou e-mail",
            emptyIcon: "person.2",
            emptyLabel: "Aucun client",
            onCreate: { isCreating = true },
            store: store
        ) { client in
            NavigationLink {
                // Une modification doit se voir dans la liste sans avoir à
                // tirer pour rafraîchir.
                ClientDetailView(client: client) { _ in
                    Task { await store.load() }
                }
            } label: {
            Card {
                HStack(spacing: 14) {
                    // Avatar d'initiales : lisible immédiatement, et rien à
                    // télécharger.
                    Text(client.initials)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Theme.primary)
                        .frame(width: 44, height: 44)
                        .background(Circle().fill(Theme.primary.opacity(0.14)))

                    VStack(alignment: .leading, spacing: 3) {
                        Text(client.name)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Theme.foreground)
                            .lineLimit(1)

                        if let subtitle = client.company ?? client.email {
                            Text(subtitle)
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.mutedForeground)
                                .lineLimit(1)
                        }

                        if let extra = [client.phone, client.city].compactMap({ $0 }).first {
                            Text(extra)
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }

                    Spacer(minLength: 0)

                    // La lettre seule suffit dans une liste : elle se lit d'un
                    // coup d'œil et le libellé tiendrait mal sur la ligne.
                    KycScoreBadge(letter: client.kycScore, showLabel: false)
                }
            }
            }
            .buttonStyle(PressableStyle())
        }
        .sheet(isPresented: $isCreating) {
            ClientFormSheet { _ in await store.load() }
        }
    }
}

// MARK: - Catalogue

struct CatalogView: View {
    /// Poussé depuis « Plus » : la pile de navigation existe déjà.
    var embedded = false

    @State private var store = ListStore<Product>(
        table: "products",
        columns: "id, name, price, monthly_price, brand_name, category_name, image_url",
        orderBy: "name",
        pageSize: 400,
        searchColumns: ["name", "brand_name", "category_name"],
        matches: { p, q in
            p.name.lowercased().contains(q)
                || (p.brandName?.lowercased().contains(q) ?? false)
                || (p.categoryName?.lowercased().contains(q) ?? false)
        }
    )

    var body: some View {
        ListScreen(
            title: "Catalogue",
            searchPrompt: "Produit, marque ou catégorie",
            emptyIcon: "shippingbox",
            emptyLabel: "Aucun produit",
            wrapsNavigation: !embedded,
            store: store
        ) { product in
            NavigationLink {
                ProductDetailView(product: product)
            } label: {
            Card {
                HStack(spacing: 14) {
                    // AsyncImage : chargement paresseux natif, avec un repli
                    // propre si l'URL est absente ou cassée.
                    AsyncImage(url: product.imageURL.flatMap(URL.init)) { image in
                        image.resizable().scaledToFit()
                    } placeholder: {
                        Image(systemName: "shippingbox.fill")
                            .font(.system(size: 20))
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
                            .lineLimit(2)

                        if let brand = product.brandName {
                            Text(brand)
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }

                    Spacer(minLength: 8)

                    VStack(alignment: .trailing, spacing: 2) {
                        if let monthly = product.monthlyPrice, monthly > 0 {
                            Text(Format.currency(monthly))
                                .font(.system(size: 15, weight: .bold))
                                .foregroundStyle(Theme.primary)
                            Text("par mois")
                                .font(.system(size: 11))
                                .foregroundStyle(Theme.mutedForeground)
                        } else {
                            Text(Format.currency(product.price))
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(Theme.foreground)
                        }
                    }
                }
            }
            }
            .buttonStyle(PressableStyle())
        }
    }
}
