import SwiftUI

// MARK: - Contrats

struct ContractsView: View {
    @State private var store = ListStore<Contract>(
        table: "contracts",
        columns: "id, client_name, monthly_payment, status, leaser_name, contract_number, equipment_description, created_at",
        matches: { c, q in
            c.clientName.lowercased().contains(q)
                || (c.contractNumber?.lowercased().contains(q) ?? false)
                || c.leaserName.lowercased().contains(q)
        }
    )

    var body: some View {
        ListScreen(
            title: "Contrats",
            searchPrompt: "Client, n° de contrat ou bailleur",
            emptyIcon: "doc.badge.clock",
            emptyLabel: "Aucun contrat",
            store: store
        ) { contract in
            NavigationLink {
                ContractDetailView(contract: contract)
            } label: {
                Card {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(contract.clientName)
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundStyle(Theme.foreground)
                                    .lineLimit(1)

                                Text(contract.contractNumber ?? contract.leaserName)
                                    .font(.system(size: 13))
                                    .foregroundStyle(Theme.mutedForeground)
                            }
                            Spacer(minLength: 8)
                            StatusBadge(label: contract.statusLabel, status: contract.status)
                        }

                        Divider().overlay(Theme.border)

                        HStack {
                            Text("Mensualité")
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.mutedForeground)
                            Spacer()
                            Text(Format.currency(contract.monthlyPayment))
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(Theme.foreground)
                        }
                    }
                }
            }
            .buttonStyle(PressableStyle())
        }
    }
}

struct ContractDetailView: View {
    let contract: Contract

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                HighlightCard(
                    label: "Mensualité",
                    value: Format.currency(contract.monthlyPayment)
                )

                Card {
                    VStack(spacing: 0) {
                        DetailRow(label: "Client", value: contract.clientName)
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Statut", value: contract.statusLabel)
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Bailleur", value: contract.leaserName)
                        if let number = contract.contractNumber {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "N° de contrat", value: number)
                        }
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Créé le", value: Format.date(contract.createdAt))
                    }
                }

                EquipmentSection(raw: contract.equipmentDescription)
            }
            .padding(20)
            .frame(maxWidth: 700)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle(contract.clientName)
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Clients

struct ClientsView: View {
    @State private var store = ListStore<Client>(
        table: "clients",
        columns: "id, name, email, company, status, phone, contact_name, vat_number, address, city, postal_code, country, notes, created_at",
        matches: { c, q in
            c.name.lowercased().contains(q)
                || (c.email?.lowercased().contains(q) ?? false)
                || (c.company?.lowercased().contains(q) ?? false)
        }
    )

    var body: some View {
        ListScreen(
            title: "Clients",
            searchPrompt: "Nom, société ou e-mail",
            emptyIcon: "person.2",
            emptyLabel: "Aucun client",
            store: store
        ) { client in
            NavigationLink {
                ClientDetailView(client: client)
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
                }
            }
            }
            .buttonStyle(PressableStyle())
        }
    }
}

// MARK: - Catalogue

struct CatalogView: View {
    @State private var store = ListStore<Product>(
        table: "products",
        columns: "id, name, price, monthly_price, brand_name, category_name, image_url",
        orderBy: "name",
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

// MARK: - Facturation

struct InvoicesView: View {
    @State private var store = ListStore<Invoice>(
        table: "invoices",
        columns: "id, amount, invoice_number, leaser_name, status, invoice_date, paid_at",
        orderBy: "invoice_date",
        matches: { i, q in
            (i.invoiceNumber?.lowercased().contains(q) ?? false)
                || i.leaserName.lowercased().contains(q)
        }
    )

    var body: some View {
        ListScreen(
            title: "Facturation",
            searchPrompt: "N° de facture ou bailleur",
            emptyIcon: "eurosign.circle",
            emptyLabel: "Aucune facture",
            store: store
        ) { invoice in
            Card {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(invoice.invoiceNumber ?? "Sans numéro")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Theme.foreground)

                        Text(invoice.leaserName)
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.mutedForeground)

                        Text(Format.date(invoice.invoiceDate))
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.mutedForeground)
                    }

                    Spacer(minLength: 8)

                    VStack(alignment: .trailing, spacing: 6) {
                        Text(Format.currency(invoice.amount))
                            .font(.system(size: 17, weight: .bold))
                            .foregroundStyle(Theme.foreground)

                        StatusBadge(
                            label: invoice.isPaid ? "Payée" : "En attente",
                            status: invoice.isPaid ? "signed" : "pending"
                        )
                    }
                }
            }
        }
    }
}
