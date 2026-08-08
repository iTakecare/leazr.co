import Foundation
import Observation
import SwiftUI
import Supabase

/// Panneau Grenke : introduction du dossier chez le bailleur, suivi de son
/// statut, signature électronique et envoi des pièces.
///
/// Tout passe par l'edge function `grenke-api`, qui porte l'authentification et
/// la conversion vers le format du partenaire. L'application ne fait que
/// déclencher les mêmes actions que le web, avec les mêmes noms.
@MainActor
@Observable
final class GrenkeStore {

    private(set) var submissions: [Submission] = []
    private(set) var status: StatusReport?
    private(set) var drift: Drift?
    private(set) var esignature: ESignatureConfig?
    private(set) var isWorking = false
    private(set) var isConfigured = false
    var errorMessage: String?
    var infoMessage: String?

    struct Submission: Decodable, Identifiable, Sendable {
        let id: String
        let requestNumber: String?
        let state: String?
        let createdAt: Date?

        enum CodingKeys: String, CodingKey {
            case id, state
            case requestNumber = "request_number"
            case createdAt = "created_at"
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            id = (try? c.decode(String.self, forKey: .id)) ?? UUID().uuidString
            requestNumber = try c.decodeIfPresent(String.self, forKey: .requestNumber)
            state = try c.decodeIfPresent(String.self, forKey: .state)
            if let raw = try c.decodeIfPresent(String.self, forKey: .createdAt) {
                createdAt = Format.parseDate(raw)
            } else { createdAt = nil }
        }
    }

    struct StatusReport: Decodable, Sendable {
        let state: String?
        let statusText: String?
        let requestNumber: String?

        enum CodingKeys: String, CodingKey {
            case state
            case statusText = "status_text"
            case requestNumber = "request_number"
        }
    }

    struct Drift: Decodable, Sendable {
        let hasDrift: Bool?
        let details: String?

        enum CodingKeys: String, CodingKey {
            case hasDrift = "has_drift"
            case details
        }
    }

    struct ESignatureConfig: Decodable, Sendable {
        let available: Bool?
        let signerEmail: String?
        let signerName: String?

        enum CodingKeys: String, CodingKey {
            case available
            case signerEmail = "signer_email"
            case signerName = "signer_name"
        }
    }

    private struct Envelope<T: Decodable>: Decodable {
        let success: Bool?
        let error: String?
        let data: T?
    }

    /// Un appel générique : toutes les actions Grenke partagent la même forme.
    private func call<T: Decodable>(_ action: String, offerId: String, payload: [String: AnyJSON]? = nil) async -> T? {
        var body: [String: AnyJSON] = [
            "action": .string(action),
            "environment": .string("production"),
            "offer_id": .string(offerId),
        ]
        if let payload { body["payload"] = .object(payload) }

        do {
            let envelope: Envelope<T> = try await Backend.client.functions.invoke(
                "grenke-api",
                options: FunctionInvokeOptions(body: body)
            )
            if let error = envelope.error {
                errorMessage = error
                return nil
            }
            return envelope.data
        } catch {
            errorMessage = "Grenke : \(action) a échoué."
            return nil
        }
    }

    func load(offerId: String) async {
        errorMessage = nil
        async let submissionsTask: [Submission]? = call("get_grenke_submissions", offerId: offerId)
        async let driftTask: Drift? = call("check_calculation_drift", offerId: offerId)
        async let configTask: ESignatureConfig? = call("get_esignature_config", offerId: offerId)

        submissions = await submissionsTask ?? []
        drift = await driftTask
        esignature = await configTask
        isConfigured = esignature != nil || !submissions.isEmpty
    }

    func refreshStatus(offerId: String) async {
        isWorking = true
        defer { isWorking = false }
        status = await call("get_status", offerId: offerId)
        if status != nil { infoMessage = "Statut Grenke mis à jour." }
    }

    func submit(offerId: String) async {
        isWorking = true
        defer { isWorking = false }
        let result: StatusReport? = await call("submit_offer", offerId: offerId)
        if result != nil {
            infoMessage = "Dossier introduit chez Grenke."
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            await load(offerId: offerId)
        }
    }

    func startESignature(offerId: String) async {
        isWorking = true
        defer { isWorking = false }
        let result: StatusReport? = await call("start_esignature", offerId: offerId)
        if result != nil {
            infoMessage = "Signature électronique lancée."
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        }
    }

    func updateCalculation(offerId: String) async {
        isWorking = true
        defer { isWorking = false }
        let result: StatusReport? = await call("update_calculation", offerId: offerId)
        if result != nil {
            infoMessage = "Calcul transmis à Grenke."
            await load(offerId: offerId)
        }
    }

    func uploadDocument(offerId: String, documentId: String) async {
        isWorking = true
        defer { isWorking = false }
        let result: StatusReport? = await call(
            "upload_document",
            offerId: offerId,
            payload: ["document_ids": .array([.string(documentId)])]
        )
        if result != nil { infoMessage = "Document transmis à Grenke." }
    }

    /// Aperçu de la charge utile réellement envoyée — utile pour comprendre un
    /// refus sans avoir à ouvrir le web.
    func previewPayload(offerId: String) async -> String? {
        struct Payload: Decodable { let preview: String? }
        let result: Payload? = await call("build_offer_payload", offerId: offerId)
        return result?.preview
    }
}

struct GrenkePanel: View {

    let offer: Offer
    let documents: [OfferDocument]

    @State private var store = GrenkeStore()
    @State private var payloadPreview: String?
    @State private var isShowingPayload = false

    var body: some View {
        VStack(spacing: 12) {
            if let error = store.errorMessage {
                ErrorBanner(message: error)
            }
            if let info = store.infoMessage {
                InfoBanner(message: info)
            }

            Card {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 8) {
                        Image(systemName: "building.columns.fill")
                            .font(.system(size: 15))
                            .foregroundStyle(Theme.violet)
                        Text("Grenke")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Theme.foreground)
                        Spacer()
                        if store.isWorking { ProgressView().controlSize(.small) }
                    }

                    if let status = store.status {
                        VStack(spacing: 0) {
                            DetailRow(label: "État", value: status.statusText ?? status.state ?? "—")
                            if let number = status.requestNumber {
                                Divider().overlay(Theme.border)
                                DetailRow(label: "N° de demande", value: number)
                            }
                        }
                    } else if store.submissions.isEmpty {
                        Text("Ce dossier n'a pas encore été introduit chez Grenke.")
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.mutedForeground)
                    }

                    // Un écart de calcul signifie que la demande a changé depuis
                    // son introduction : la transmettre telle quelle ferait
                    // signer un montant qui n'est plus le bon.
                    if store.drift?.hasDrift == true {
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 13))
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Écart de calcul détecté")
                                    .font(.system(size: 13, weight: .semibold))
                                if let details = store.drift?.details, !details.isEmpty {
                                    Text(details).font(.system(size: 12))
                                }
                            }
                        }
                        .foregroundStyle(Theme.amber)
                        .padding(11)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(Theme.amber.opacity(0.13))
                        )
                    }
                }
            }

            ActionRow(
                icon: "paperplane.fill",
                tint: Theme.violet,
                title: "Introduire chez Grenke",
                subtitle: "Envoi de la demande de financement",
                isBusy: store.isWorking
            ) { Task { await store.submit(offerId: offer.id) } }

            ActionRow(
                icon: "arrow.clockwise",
                tint: Theme.sky,
                title: "Rafraîchir le statut",
                subtitle: "Interroger Grenke sur l'avancement",
                isBusy: store.isWorking
            ) { Task { await store.refreshStatus(offerId: offer.id) } }

            if store.drift?.hasDrift == true {
                ActionRow(
                    icon: "function",
                    tint: Theme.amber,
                    title: "Transmettre le nouveau calcul",
                    subtitle: "Aligner Grenke sur la demande actuelle",
                    isBusy: store.isWorking
                ) { Task { await store.updateCalculation(offerId: offer.id) } }
            }

            ActionRow(
                icon: "signature",
                tint: Theme.emerald,
                title: "Lancer la signature Grenke",
                subtitle: store.esignature?.signerEmail ?? "Signature électronique du partenaire",
                isBusy: store.isWorking
            ) { Task { await store.startESignature(offerId: offer.id) } }

            ActionRow(
                icon: "curlybraces",
                tint: Theme.mutedForeground,
                title: "Aperçu de la charge utile",
                subtitle: "Ce qui serait envoyé, sans rien envoyer"
            ) {
                Task {
                    payloadPreview = await store.previewPayload(offerId: offer.id)
                    isShowingPayload = payloadPreview != nil
                }
            }

            if !documents.isEmpty {
                SectionHeader(title: "Transmettre une pièce", count: documents.count)
                ForEach(documents) { document in
                    ActionRow(
                        icon: "doc.fill",
                        tint: Theme.sky,
                        title: document.typeLabel,
                        subtitle: document.fileName,
                        isBusy: store.isWorking
                    ) {
                        Task { await store.uploadDocument(offerId: offer.id, documentId: document.id) }
                    }
                }
            }

            if !store.submissions.isEmpty {
                SectionHeader(title: "Envois", count: store.submissions.count)
                ForEach(store.submissions) { submission in
                    Card {
                        HStack {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(submission.requestNumber ?? "Sans numéro")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(Theme.foreground)
                                Text(submission.state ?? "—")
                                    .font(.system(size: 12))
                                    .foregroundStyle(Theme.mutedForeground)
                            }
                            Spacer()
                            Text(Format.date(submission.createdAt))
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }
                }
            }
        }
        .sheet(isPresented: $isShowingPayload) {
            NavigationStack {
                ScrollView {
                    Text(payloadPreview ?? "")
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundStyle(Theme.foreground)
                        .textSelection(.enabled)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(16)
                }
                .background(Theme.background.ignoresSafeArea())
                .navigationTitle("Charge utile Grenke")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Fermer") { isShowingPayload = false }
                    }
                }
            }
        }
        .task { await store.load(offerId: offer.id) }
    }
}

// MARK: - Prestations externes et produits promo

/// Services facturés directement par un prestataire, et produits mis en avant
/// dans l'offre. Ni les uns ni les autres n'entrent dans la mensualité.
struct ExternalServicesSection: View {

    let offerId: String

    @State private var services: [OfferExtra] = []
    @State private var promos: [OfferExtra] = []

    var body: some View {
        VStack(spacing: 12) {
            if services.isEmpty && promos.isEmpty {
                EmptyHint(icon: "shippingbox", label: "Aucune prestation externe")
            }

            if !services.isEmpty {
                SectionHeader(title: "Prestations externes", count: services.count)
                Text("Facturées directement par leur prestataire, hors mensualité.")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.mutedForeground)
                    .frame(maxWidth: .infinity, alignment: .leading)
                ForEach(services) { ExtraCard(extra: $0, tint: Theme.teal) }
            }

            if !promos.isEmpty {
                SectionHeader(title: "Produits mis en avant", count: promos.count)
                ForEach(promos) { ExtraCard(extra: $0, tint: Theme.rose) }
            }
        }
        .task {
            services = (try? await Backend.client
                .from("offer_external_services")
                .select(OfferExtra.columns)
                .eq("offer_id", value: offerId)
                .order("created_at", ascending: true)
                .execute().value) ?? []

            promos = (try? await Backend.client
                .from("offer_promo_products")
                .select(OfferExtra.columns)
                .eq("offer_id", value: offerId)
                .order("position", ascending: true)
                .execute().value) ?? []
        }
    }
}

struct OfferExtra: Decodable, Identifiable, Sendable {
    let id: String
    let providerName: String?
    let productName: String?
    let description: String?
    let priceHTVA: Double
    let billingPeriod: String?
    let quantity: Int

    static let columns = "id, provider_name, product_name, description, price_htva, billing_period, quantity"

    enum CodingKeys: String, CodingKey {
        case id, description, quantity
        case providerName = "provider_name"
        case productName = "product_name"
        case priceHTVA = "price_htva"
        case billingPeriod = "billing_period"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        providerName = try c.decodeIfPresent(String.self, forKey: .providerName)
        productName = try c.decodeIfPresent(String.self, forKey: .productName)
        description = try c.decodeIfPresent(String.self, forKey: .description)
        priceHTVA = try c.decodeIfPresent(Double.self, forKey: .priceHTVA) ?? 0
        billingPeriod = try c.decodeIfPresent(String.self, forKey: .billingPeriod)
        quantity = try c.decodeIfPresent(Int.self, forKey: .quantity) ?? 1
    }

    var periodLabel: String {
        switch billingPeriod {
        case "monthly":   return "/mois"
        case "yearly":    return "/an"
        case "one_time":  return ""
        default:          return ""
        }
    }
}

struct ExtraCard: View {
    let extra: OfferExtra
    let tint: Color

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(extra.productName ?? "Prestation")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Theme.foreground)
                        if let provider = extra.providerName {
                            Text(provider)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(tint)
                        }
                    }
                    Spacer(minLength: 8)
                    Text("\(Format.currency(extra.priceHTVA))\(extra.periodLabel)")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(Theme.foreground)
                }

                if let description = extra.description, !description.isEmpty {
                    Text(description)
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.mutedForeground)
                }

                if extra.quantity > 1 {
                    Text("Quantité : \(extra.quantity)")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                }
            }
        }
    }
}

// MARK: - E-mails liés

/// Échanges rattachés au dossier par la synchronisation IMAP.
struct LinkedEmailsSection: View {

    let offerId: String
    @State private var emails: [LinkedEmail] = []

    var body: some View {
        VStack(spacing: 12) {
            if emails.isEmpty {
                EmptyHint(icon: "envelope", label: "Aucun e-mail rattaché")
            }

            ForEach(emails) { email in
                Card {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 8) {
                            Image(systemName: email.isIncoming ? "arrow.down.left" : "arrow.up.right")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(width: 22, height: 22)
                                .background(Circle().fill(email.isIncoming ? Theme.sky : Theme.violet))

                            Text(email.subject ?? "Sans objet")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(Theme.foreground)
                                .lineLimit(2)

                            Spacer(minLength: 4)

                            Text(Format.date(email.receivedAt))
                                .font(.system(size: 11))
                                .foregroundStyle(Theme.mutedForeground)
                        }

                        if let from = email.fromAddress {
                            Text(from)
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.mutedForeground)
                        }

                        if let preview = email.bodyPreview, !preview.isEmpty {
                            Text(preview)
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.mutedForeground)
                                .lineLimit(4)
                        }
                    }
                }
            }
        }
        .task {
            emails = (try? await Backend.client
                .from("offer_linked_emails")
                .select("id, subject, from_address, to_address, body_preview, direction, received_at")
                .eq("offer_id", value: offerId)
                .order("received_at", ascending: false)
                .limit(30)
                .execute().value) ?? []
        }
    }
}

struct LinkedEmail: Decodable, Identifiable, Sendable {
    let id: String
    let subject: String?
    let fromAddress: String?
    let bodyPreview: String?
    let direction: String?
    let receivedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, subject, direction
        case fromAddress = "from_address"
        case bodyPreview = "body_preview"
        case receivedAt = "received_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        subject = try c.decodeIfPresent(String.self, forKey: .subject)
        fromAddress = try c.decodeIfPresent(String.self, forKey: .fromAddress)
        bodyPreview = try c.decodeIfPresent(String.self, forKey: .bodyPreview)
        direction = try c.decodeIfPresent(String.self, forKey: .direction)
        if let raw = try c.decodeIfPresent(String.self, forKey: .receivedAt) {
            receivedAt = Format.parseDate(raw)
        } else { receivedAt = nil }
    }

    var isIncoming: Bool { direction != "out" }
}
