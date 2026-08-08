import Foundation
import Observation
import SwiftUI
import Supabase

@MainActor
@Observable
final class OffersStore {
    private(set) var offers: [Offer] = []
    private(set) var isLoading = false
    var errorMessage: String?
    var search = ""

    /// Les offres visibles sont déjà filtrées par les politiques RLS côté
    /// serveur : inutile de passer un company_id depuis le client.
    func load() async {
        isLoading = true
        defer { isLoading = false }

        do {
            offers = try await Backend.client
                .from("offers")
                .select("id, client_name, amount, monthly_payment, status, dossier_number, created_at")
                .order("created_at", ascending: false)
                .limit(100)
                .execute()
                .value
            errorMessage = nil
        } catch {
            errorMessage = "Impossible de charger les offres."
        }
    }

    var filtered: [Offer] {
        guard !search.isEmpty else { return offers }
        let q = search.lowercased()
        return offers.filter {
            $0.clientName.lowercased().contains(q)
                || ($0.dossierNumber?.lowercased().contains(q) ?? false)
        }
    }
}

struct OffersView: View {

    @State private var store = OffersStore()
    @State private var isCreating = false

    var body: some View {
        NavigationStack {
            Group {
                if store.offers.isEmpty && store.isLoading {
                    ProgressView().tint(Theme.mutedForeground)
                } else if store.filtered.isEmpty {
                    emptyState
                } else {
                    list
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Offres")
            .toolbar {
                ProfileMenu()
                ToolbarItem(placement: .topBarLeading) {
                    Button { isCreating = true } label: {
                        Image(systemName: "plus.circle.fill").font(.system(size: 20))
                    }
                }
            }
            .sheet(isPresented: $isCreating) {
                CreateOfferView { Task { await store.load() } }
            }
            .searchable(text: Bindable(store).search, prompt: "Client ou n° de dossier")
            .refreshable { await store.load() }
            .task { if store.offers.isEmpty { await store.load() } }
        }
    }

    private var list: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                if let error = store.errorMessage {
                    ErrorBanner(message: error)
                }

                ForEach(store.filtered) { offer in
                    NavigationLink {
                        OfferDetailView(offer: offer)
                    } label: {
                        OfferRow(offer: offer)
                    }
                    .buttonStyle(PressableStyle())
                }
            }
            .padding(20)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "tray")
                .font(.system(size: 42, weight: .light))
                .foregroundStyle(Theme.mutedForeground)

            Text(store.search.isEmpty ? "Aucune offre" : "Aucun résultat")
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(Theme.foreground)
        }
    }
}

struct OfferRow: View {
    let offer: Offer

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(offer.clientName)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                        .lineLimit(1)

                    if let dossier = offer.dossierNumber {
                        Text(dossier)
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.mutedForeground)
                    }
                }

                Spacer(minLength: 8)

                StatusBadge(label: offer.statusLabel, status: offer.status)
            }

            Divider().overlay(Theme.border)

            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Mensualité")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                    Text(Format.currency(offer.monthlyPayment))
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("Montant")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                    Text(Format.currency(offer.amount))
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                }
            }

            Text(Format.date(offer.createdAt))
                .font(.system(size: 12))
                .foregroundStyle(Theme.mutedForeground)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                .fill(Theme.surface)
        )
    }
}

struct StatusBadge: View {
    let label: String
    let status: String

    private var tint: Color {
        switch status {
        case "signed", "accepted", "financed": return .green
        case "rejected":                       return Theme.destructive
        case "sent", "pending":                return .orange
        default:                               return Theme.mutedForeground
        }
    }

    var body: some View {
        Text(label)
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(tint)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(Capsule().fill(tint.opacity(0.14)))
    }
}

/// Détail d'une offre.
struct OfferDetailView: View {
    let offer: Offer
    @State private var equipment = OfferEquipmentStore()

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                HighlightCard(
                    label: "Mensualité",
                    value: Format.currency(offer.monthlyPayment)
                )

                Card {
                    VStack(spacing: 0) {
                        DetailRow(label: "Client", value: offer.clientName)
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Statut", value: offer.statusLabel)
                        if let dossier = offer.dossierNumber {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "N° de dossier", value: dossier)
                        }
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Montant financé", value: Format.currency(offer.amount), emphasis: true)
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Créée le", value: Format.date(offer.createdAt))
                    }
                }

                if !equipment.items.isEmpty {
                    SectionHeader(title: "Équipements", count: equipment.items.count)

                    ForEach(equipment.items) { item in
                        Card {
                            VStack(alignment: .leading, spacing: 8) {
                                HStack(alignment: .top) {
                                    Text(item.title)
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundStyle(Theme.foreground)
                                    Spacer(minLength: 8)
                                    if item.quantity > 1 {
                                        Text("×\(item.quantity)")
                                            .font(.system(size: 13, weight: .semibold))
                                            .foregroundStyle(Theme.mutedForeground)
                                    }
                                }

                                HStack {
                                    Text("Mensualité")
                                        .font(.system(size: 13))
                                        .foregroundStyle(Theme.mutedForeground)
                                    Spacer()
                                    Text(Format.currency(item.monthlyPayment))
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundStyle(Theme.primary)
                                }
                            }
                        }
                    }
                }
            }
            .padding(20)
            .frame(maxWidth: 700)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle(offer.clientName)
        .navigationBarTitleDisplayMode(.inline)
        .task { await equipment.load(offerId: offer.id) }
    }
}
