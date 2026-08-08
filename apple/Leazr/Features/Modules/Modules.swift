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
