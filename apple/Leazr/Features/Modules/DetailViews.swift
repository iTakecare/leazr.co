import Foundation
import Observation
import SwiftUI
import Supabase

// MARK: - Fiche produit

struct ProductDetailView: View {
    let product: Product

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Visuel plein cadre : c'est ce qu'on regarde en premier sur
                // une fiche produit.
                AsyncImage(url: product.imageURL.flatMap(URL.init)) { image in
                    image.resizable().scaledToFit()
                } placeholder: {
                    Image(systemName: "shippingbox.fill")
                        .font(.system(size: 46))
                        .foregroundStyle(Theme.mutedForeground)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 220)
                .background(
                    RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                        .fill(Theme.surface)
                )

                if let monthly = product.monthlyPrice, monthly > 0 {
                    HighlightCard(label: "Mensualité", value: Format.currency(monthly))
                }

                Card {
                    VStack(spacing: 0) {
                        DetailRow(label: "Produit", value: product.name)
                        if let brand = product.brandName {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Marque", value: brand)
                        }
                        if let category = product.categoryName {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Catégorie", value: category)
                        }
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Prix d'achat", value: Format.currency(product.price), emphasis: true)
                    }
                }
            }
            .padding(20)
            .frame(maxWidth: 700)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle(product.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Fiche client

@MainActor
@Observable
final class ClientDetailStore {
    private(set) var offers: [Offer] = []
    private(set) var contracts: [Contract] = []
    private(set) var kyc: [KYCReport] = []
    private(set) var isLoading = false

    /// On rapproche par nom : c'est la clé que remplissent offres et contrats,
    /// `client_id` n'étant pas toujours renseigné sur les dossiers anciens.
    func load(clientName: String) async {
        isLoading = true
        defer { isLoading = false }

        offers = (try? await Backend.client
            .from("offers")
            .select("id, client_name, amount, monthly_payment, status, dossier_number, created_at")
            .eq("client_name", value: clientName)
            .order("created_at", ascending: false)
            .limit(50)
            .execute()
            .value) ?? []

        contracts = (try? await Backend.client
            .from("contracts")
            .select("id, client_name, monthly_payment, status, leaser_name, contract_number, equipment_description, created_at")
            .eq("client_name", value: clientName)
            .order("created_at", ascending: false)
            .limit(50)
            .execute()
            .value) ?? []
    }

    /// Rapports KYC du client — analyse d'identité et de solvabilité.
    func loadKYC(clientId: String) async {
        kyc = (try? await Backend.client
            .from("client_kyc_reports")
            .select("id, status, source, analyzed_at, error_message")
            .eq("client_id", value: clientId)
            .order("created_at", ascending: false)
            .limit(10)
            .execute().value) ?? []
    }

    var monthlyTotal: Double { contracts.reduce(0) { $0 + $1.monthlyPayment } }
}

struct ClientDetailView: View {
    let client: Client
    @State private var store = ClientDetailStore()

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                header

                if store.monthlyTotal > 0 {
                    HighlightCard(
                        label: "Loyers mensuels en cours",
                        value: Format.currency(store.monthlyTotal)
                    )
                }

                Card {
                    VStack(spacing: 0) {
                        DetailRow(label: "Nom", value: client.name)
                        if let company = client.company {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Société", value: company)
                        }
                        if let email = client.email {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "E-mail", value: email)
                        }
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Client depuis", value: Format.date(client.createdAt))
                    }
                }

                if !store.kyc.isEmpty {
                    SectionHeader(title: "KYC", count: store.kyc.count)
                    ForEach(store.kyc) { report in
                        Card {
                            HStack {
                                Image(systemName: "checkmark.shield.fill")
                                    .font(.system(size: 16))
                                    .foregroundStyle(Theme.teal)

                                VStack(alignment: .leading, spacing: 3) {
                                    Text(report.statusLabel)
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundStyle(Theme.foreground)
                                    Text(report.source.capitalized)
                                        .font(.system(size: 13))
                                        .foregroundStyle(Theme.mutedForeground)
                                }

                                Spacer()

                                Text(Format.date(report.analyzedAt))
                                    .font(.system(size: 12))
                                    .foregroundStyle(Theme.mutedForeground)
                            }
                        }
                    }
                }

                if store.isLoading {
                    ProgressView().tint(Theme.mutedForeground).padding(.top, 20)
                }

                if !store.offers.isEmpty {
                    SectionHeader(title: "Offres", count: store.offers.count)
                    ForEach(store.offers) { offer in
                        NavigationLink { OfferDetailView(offer: offer) } label: {
                            OfferRow(offer: offer)
                        }
                        .buttonStyle(PressableStyle())
                    }
                }

                if !store.contracts.isEmpty {
                    SectionHeader(title: "Contrats", count: store.contracts.count)
                    ForEach(store.contracts) { contract in
                        NavigationLink { ContractDetailView(contract: contract) } label: {
                            Card {
                                HStack {
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(contract.contractNumber ?? contract.leaserName)
                                            .font(.system(size: 15, weight: .semibold))
                                            .foregroundStyle(Theme.foreground)
                                        Text(contract.statusLabel)
                                            .font(.system(size: 13))
                                            .foregroundStyle(Theme.mutedForeground)
                                    }
                                    Spacer()
                                    Text(Format.currency(contract.monthlyPayment))
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundStyle(Theme.foreground)
                                }
                            }
                        }
                        .buttonStyle(PressableStyle())
                    }
                }
            }
            .padding(20)
            .frame(maxWidth: 700)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle(client.name)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await store.load(clientName: client.name)
            await store.loadKYC(clientId: client.id)
        }
    }

    private var header: some View {
        VStack(spacing: 12) {
            Text(client.initials)
                .font(.system(size: 26, weight: .semibold))
                .foregroundStyle(Theme.primary)
                .frame(width: 76, height: 76)
                .background(Circle().fill(Theme.primary.opacity(0.14)))

            Text(client.company ?? client.name)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Theme.foreground)
        }
        .padding(.top, 4)
    }
}

/// Titre de section avec compteur, réutilisé dans les fiches.
struct SectionHeader: View {
    let title: String
    let count: Int

    var body: some View {
        HStack {
            Text(title)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Theme.foreground)
            Text("\(count)")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Theme.mutedForeground)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(Capsule().fill(Theme.border.opacity(0.5)))
            Spacer()
        }
        .padding(.top, 8)
    }
}

// MARK: - Équipements d'une offre

@MainActor
@Observable
final class OfferEquipmentStore {
    private(set) var items: [OfferEquipment] = []

    func load(offerId: String) async {
        items = (try? await Backend.client
            .from("offer_equipment")
            .select("id, title, quantity, purchase_price, monthly_payment")
            .eq("offer_id", value: offerId)
            .execute()
            .value) ?? []
    }
}
