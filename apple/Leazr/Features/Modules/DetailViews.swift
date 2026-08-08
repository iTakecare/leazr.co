import Foundation
import Observation
import SwiftUI
import Supabase

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
            .select("id, client_name, amount, monthly_payment, status, workflow_status, dossier_number, created_at")
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

    /// Fiche telle qu'elle a été ouverte. L'édition renvoie la version
    /// enregistrée par le serveur, qui prend alors le dessus.
    private let initialClient: Client
    var onChange: ((Client) -> Void)?

    init(client: Client, onChange: ((Client) -> Void)? = nil) {
        self.initialClient = client
        self.onChange = onChange
    }

    @State private var store = ClientDetailStore()
    @State private var edited: Client?
    @State private var isEditing = false

    private var client: Client { edited ?? initialClient }

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

                // Le score KYC conditionne l'acceptation du dossier chez le
                // bailleur : il se lit avant les coordonnées.
                KycScoreCard(
                    letter: client.kycScore,
                    reasons: client.kycScoreReasons,
                    computedAt: client.kycScoreComputedAt
                )

                // Actions directes : appeler, écrire, itinéraire. C'est ce
                // qu'on veut d'une fiche client sur un téléphone.
                ContactActions(client: client)

                Card {
                    VStack(spacing: 0) {
                        DetailRow(label: "Nom", value: client.name)
                        if let company = client.company {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Société", value: company)
                        }
                        if let contact = client.contactName {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Contact", value: contact)
                        }
                        if let email = client.email {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "E-mail", value: email)
                        }
                        if let phone = client.phone {
                            Divider().overlay(Theme.border)
                            PhoneRow(phone: phone)
                        }
                        if let vat = client.vatNumber {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "N° d'entreprise", value: vat)
                        }
                        if let address = client.fullAddress {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Adresse", value: address)
                        }
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Client depuis", value: Format.date(client.createdAt))
                    }
                }

                if let notes = client.notes, !notes.isEmpty {
                    Card {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Notes")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(Theme.foreground)
                            Text(notes)
                                .font(.system(size: 15))
                                .foregroundStyle(Theme.mutedForeground)
                        }
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
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { isEditing = true } label: {
                    Image(systemName: "square.and.pencil").font(.system(size: 17))
                }
            }
        }
        .sheet(isPresented: $isEditing) {
            ClientFormSheet(existing: client) { saved in
                guard let saved else { return }
                edited = saved
                onChange?(saved)
                // Le nom est la clé de rapprochement des dossiers : s'il a
                // changé, la liste des offres et contrats doit être refaite.
                await store.load(clientName: saved.name)
            }
        }
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

            KycScoreBadge(letter: client.kycScore)
        }
        .padding(.top, 4)
    }
}

/// Titre de section avec compteur, réutilisé dans les fiches.
struct SectionHeader: View {
    let title: String
    /// Le compteur est facultatif : toutes les sections ne dénombrent pas
    /// quelque chose.
    var count: Int?

    var body: some View {
        HStack {
            Text(title)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Theme.foreground)
            if let count {
                Text("\(count)")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Theme.mutedForeground)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Capsule().fill(Theme.border.opacity(0.5)))
            }
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


/// Appeler, écrire, ouvrir l'itinéraire — les trois gestes d'une fiche client
/// en mobilité. Chaque bouton n'apparaît que si la donnée existe.
/// Appeler, écrire, s'y rendre. Prend des coordonnées brutes plutôt qu'un type
/// précis : elles viennent aussi bien d'une fiche client que d'une affaire.
struct ContactActions: View {
    let phone: String?
    let email: String?
    let address: String?

    init(phone: String?, email: String?, address: String?) {
        self.phone = phone
        self.email = email
        self.address = address
    }

    init(client: Client) {
        self.init(phone: client.phone, email: client.email, address: client.fullAddress)
    }

    var body: some View {
        HStack(spacing: 10) {
            // L'appel passe par le composeur : il respecte le softphone choisi
            // et sait nettoyer les numéros venus des imports.
            CallButton(phone: phone)
            if let email, !email.isEmpty, let url = URL(string: "mailto:\(email)") {
                ContactAction(icon: "envelope.fill", label: "E-mail", tint: Theme.sky, url: url)
            }
            if let address, !address.isEmpty,
               let encoded = address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
               let url = URL(string: "http://maps.apple.com/?q=\(encoded)") {
                ContactAction(icon: "map.fill", label: "Itinéraire", tint: Theme.violet, url: url)
            }
        }
    }
}

struct ContactAction: View {
    let icon: String
    let label: String
    let tint: Color
    let url: URL

    @Environment(\.openURL) private var openURL

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            openURL(url)
        } label: {
            VStack(spacing: 6) {
                Image(systemName: icon).font(.system(size: 17, weight: .semibold))
                Text(label).font(.system(size: 12, weight: .medium))
            }
            .foregroundStyle(tint)
            .frame(maxWidth: .infinity)
            .frame(height: 62)
            .background(
                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                    .fill(tint.opacity(0.12))
            )
        }
        .buttonStyle(PressableStyle())
    }
}
