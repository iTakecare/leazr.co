import Foundation
import Observation
import SwiftUI
import Supabase

// MARK: - Notes internes

/// Notes internes du dossier (`offer_notes`). Elles ne sortent jamais au
/// client : c'est la mémoire de l'équipe sur l'affaire.
@MainActor
@Observable
final class OfferNotesStore {
    private(set) var notes: [OfferNote] = []
    private(set) var isWorking = false
    var errorMessage: String?

    func load(offerId: String) async {
        notes = (try? await Backend.client
            .from("offer_notes")
            .select("id, content, type, created_at, created_by")
            .eq("offer_id", value: offerId)
            .order("created_at", ascending: false)
            .limit(50)
            .execute().value) ?? []
    }

    func add(offerId: String, content: String, type: String) async -> Bool {
        isWorking = true
        defer { isWorking = false }

        do {
            try await Backend.client
                .from("offer_notes")
                .insert([
                    "offer_id": AnyJSON.string(offerId),
                    "content": .string(content),
                    "type": .string(type),
                    "created_by": Session.shared.userId.map(AnyJSON.string) ?? .null,
                ])
                .execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            await load(offerId: offerId)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            errorMessage = "Note non enregistrée."
            return false
        }
    }

    func delete(_ note: OfferNote, offerId: String) async {
        _ = try? await Backend.client
            .from("offer_notes")
            .delete()
            .eq("id", value: note.id)
            .execute()
        await load(offerId: offerId)
    }
}

struct OfferNote: Decodable, Identifiable, Sendable {
    let id: String
    let content: String
    let type: String
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, content, type
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        content = try c.decodeIfPresent(String.self, forKey: .content) ?? ""
        type = try c.decodeIfPresent(String.self, forKey: .type) ?? "internal"
        if let raw = try c.decodeIfPresent(String.self, forKey: .createdAt) {
            createdAt = Format.parseDate(raw)
        } else { createdAt = nil }
    }

    var typeLabel: String {
        switch type {
        case "internal":  return "Note interne"
        case "client":    return "Échange client"
        case "leaser":    return "Échange bailleur"
        default:          return type.capitalized
        }
    }

    var tint: Color {
        switch type {
        case "client": return Theme.sky
        case "leaser": return Theme.violet
        default:       return Theme.mutedForeground
        }
    }
}

struct OfferNotesSection: View {

    let offerId: String
    @State private var store = OfferNotesStore()
    @State private var draft = ""
    @State private var type = "internal"

    private static let types: [(code: String, label: String)] = [
        ("internal", "Interne"),
        ("client", "Client"),
        ("leaser", "Bailleur"),
    ]

    var body: some View {
        VStack(spacing: 12) {
            if let error = store.errorMessage {
                ErrorBanner(message: error)
            }

            Card {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 8) {
                        ForEach(Self.types, id: \.code) { option in
                            SelectChip(
                                label: option.label,
                                isSelected: type == option.code,
                                tint: Theme.violet
                            ) { type = option.code }
                        }
                    }

                    LeazrTextArea(placeholder: "Ajouter une note…", text: $draft)

                    PrimaryButton(
                        title: "Enregistrer la note",
                        systemImage: "square.and.pencil",
                        isLoading: store.isWorking,
                        isEnabled: !draft.trimmingCharacters(in: .whitespaces).isEmpty
                    ) {
                        Task {
                            if await store.add(
                                offerId: offerId,
                                content: draft.trimmingCharacters(in: .whitespacesAndNewlines),
                                type: type
                            ) {
                                draft = ""
                            }
                        }
                    }
                }
            }

            if store.notes.isEmpty {
                EmptyHint(icon: "note.text", label: "Aucune note")
            }

            ForEach(store.notes) { note in
                Card {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 8) {
                            Text(note.typeLabel)
                                .font(.system(size: 11, weight: .bold))
                                .foregroundStyle(note.tint)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Capsule().fill(note.tint.opacity(0.15)))

                            Spacer()

                            Text(Format.dateTime(note.createdAt))
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.mutedForeground)

                            Button(role: .destructive) {
                                Task { await store.delete(note, offerId: offerId) }
                            } label: {
                                Image(systemName: "trash")
                                    .font(.system(size: 12))
                                    .foregroundStyle(Theme.destructive)
                            }
                            .buttonStyle(.plain)
                        }

                        Text(note.content)
                            .font(.system(size: 14))
                            .foregroundStyle(Theme.foreground)
                    }
                }
            }
        }
        .task { await store.load(offerId: offerId) }
    }
}

// MARK: - Résumé IA

/// Résumé du dossier produit par `generate-offer-summary`, avec son verdict de
/// risque et le KYC associé.
struct OfferAISummaryCard: View {

    let offerId: String

    @State private var summary: Summary?
    @State private var kyc: KYC?
    @State private var isLoading = false
    @State private var errorMessage: String?

    struct Response: Decodable {
        let summary: Summary?
        let kyc: KYC?
        let error: String?
    }

    struct Summary: Decodable {
        let riskLevel: String?
        let synthesis: String?
        let strengths: [String]?
        let weaknesses: [String]?
        let recommendation: String?

        enum CodingKeys: String, CodingKey {
            case synthesis, strengths, weaknesses, recommendation
            case riskLevel = "risk_level"
        }
    }

    struct KYC: Decodable {
        let status: String?
        let score: Double?
        let summary: String?
    }

    private var riskTint: Color {
        switch summary?.riskLevel {
        case "faible", "low":      return Theme.emerald
        case "eleve", "élevé", "high": return Theme.destructive
        default:                   return Theme.amber
        }
    }

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 15))
                        .foregroundStyle(Theme.violet)
                    Text("Résumé du dossier")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                    Spacer()
                    if let level = summary?.riskLevel {
                        Text("Risque \(level)")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(riskTint)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Capsule().fill(riskTint.opacity(0.15)))
                    }
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.destructive)
                }

                if let synthesis = summary?.synthesis, !synthesis.isEmpty {
                    Text(synthesis)
                        .font(.system(size: 14))
                        .foregroundStyle(Theme.mutedForeground)
                }

                if let strengths = summary?.strengths, !strengths.isEmpty {
                    bulletList(title: "Points forts", items: strengths, tint: Theme.emerald, icon: "plus.circle.fill")
                }
                if let weaknesses = summary?.weaknesses, !weaknesses.isEmpty {
                    bulletList(title: "Points d'attention", items: weaknesses, tint: Theme.amber, icon: "exclamationmark.circle.fill")
                }

                if let recommendation = summary?.recommendation, !recommendation.isEmpty {
                    Text(recommendation)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Theme.foreground)
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(riskTint.opacity(0.1))
                        )
                }

                if let kyc, let text = kyc.summary, !text.isEmpty {
                    Divider().overlay(Theme.border)
                    Text("KYC — \(kyc.status ?? "inconnu")")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Theme.teal)
                    Text(text)
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.mutedForeground)
                }

                // Le résumé coûte un appel au modèle : on ne le déclenche que
                // sur demande explicite, jamais à l'ouverture de l'écran.
                TertiaryButton(
                    title: summary == nil ? "Générer le résumé" : "Regénérer",
                    systemImage: "sparkles"
                ) {
                    Task { await generate() }
                }
                .disabled(isLoading)
                .overlay(alignment: .trailing) {
                    if isLoading { ProgressView().controlSize(.small) }
                }
            }
        }
    }

    private func bulletList(title: String, items: [String], tint: Color, icon: String) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(title)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(tint)
            ForEach(items, id: \.self) { item in
                HStack(alignment: .top, spacing: 6) {
                    Image(systemName: icon)
                        .font(.system(size: 10))
                        .foregroundStyle(tint)
                        .padding(.top, 3)
                    Text(item)
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.mutedForeground)
                }
            }
        }
    }

    private func generate() async {
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil
        do {
            let response: Response = try await Backend.client.functions.invoke(
                "generate-offer-summary",
                options: FunctionInvokeOptions(body: ["offer_id": AnyJSON.string(offerId)])
            )
            if let error = response.error {
                errorMessage = error
                return
            }
            summary = response.summary
            kyc = response.kyc
        } catch {
            errorMessage = "Le résumé n'a pas pu être généré."
        }
    }
}

// MARK: - Analyse de financement

/// Encours du client chez le bailleur et rapport de solvabilité, repris de
/// `FinancingAnalysisCard`. C'est ce qui dit si le dossier passera.
struct FinancingAnalysisCard: View {

    let offer: Offer

    @State private var exposure: Exposure?
    @State private var report: CreditReport?
    @State private var isLoading = false

    struct Exposure: Decodable {
        let totalOutstanding: Double?
        let contractsCount: Int?
        let outstandingLimit: Double?

        enum CodingKeys: String, CodingKey {
            case totalOutstanding = "total_outstanding"
            case contractsCount = "contracts_count"
            case outstandingLimit = "outstanding_limit"
        }
    }

    struct CreditReport: Decodable {
        let ratingLabel: String?
        let ratingValue: String?
        let creditLimit: Double?
        let createdAt: Date?

        enum CodingKeys: String, CodingKey {
            case ratingLabel = "rating_label"
            case ratingValue = "rating_value"
            case creditLimit = "credit_limit"
            case createdAt = "created_at"
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            ratingLabel = try c.decodeIfPresent(String.self, forKey: .ratingLabel)
            ratingValue = try c.decodeIfPresent(String.self, forKey: .ratingValue)
            creditLimit = try c.decodeIfPresent(Double.self, forKey: .creditLimit)
            if let raw = try c.decodeIfPresent(String.self, forKey: .createdAt) {
                createdAt = Format.parseDate(raw)
            } else { createdAt = nil }
        }
    }

    /// L'encours après cette demande dépasse-t-il la limite fixée ? C'est le
    /// seul chiffre qui décide vraiment.
    private var projected: Double {
        (exposure?.totalOutstanding ?? 0) + offer.amount
    }

    private var isOverLimit: Bool {
        guard let limit = exposure?.outstandingLimit, limit > 0 else { return false }
        return projected > limit
    }

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    Image(systemName: "chart.pie.fill")
                        .font(.system(size: 15))
                        .foregroundStyle(Theme.teal)
                    Text("Analyse de financement")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                    Spacer()
                    if isLoading { ProgressView().controlSize(.small) }
                }

                if exposure == nil && report == nil && !isLoading {
                    Text("Aucune donnée d'encours pour ce client.")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.mutedForeground)
                }

                if let exposure {
                    VStack(spacing: 0) {
                        DetailRow(
                            label: "Encours actuel",
                            value: Format.currency(exposure.totalOutstanding ?? 0)
                        )
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Contrats en cours", value: "\(exposure.contractsCount ?? 0)")
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Cette demande", value: Format.currency(offer.amount))
                        Divider().overlay(Theme.border)
                        DetailRow(
                            label: "Encours projeté",
                            value: Format.currency(projected),
                            emphasis: true
                        )
                        if let limit = exposure.outstandingLimit, limit > 0 {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Limite d'encours", value: Format.currency(limit))
                        }
                    }

                    if isOverLimit {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 13))
                            Text("L'encours projeté dépasse la limite fixée pour ce client.")
                                .font(.system(size: 13, weight: .medium))
                        }
                        .foregroundStyle(Theme.destructive)
                        .padding(11)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(Theme.destructive.opacity(0.12))
                        )
                    }
                }

                if let report {
                    Divider().overlay(Theme.border)
                    VStack(spacing: 0) {
                        DetailRow(
                            label: "Cotation",
                            value: [report.ratingValue, report.ratingLabel]
                                .compactMap { $0 }
                                .joined(separator: " — ")
                        )
                        if let limit = report.creditLimit, limit > 0 {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Limite de crédit", value: Format.currency(limit))
                        }
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Rapport du", value: Format.date(report.createdAt))
                    }
                }
            }
        }
        .task { await load() }
    }

    private func load() async {
        guard let clientId = offer.clientId else { return }
        isLoading = true
        defer { isLoading = false }

        // L'encours vient de la RPC métier ; le rapport de solvabilité du
        // dernier relevé Graydon stocké pour ce client.
        exposure = try? await Backend.client
            .rpc("get_financing_exposure", params: ["p_client_id": clientId])
            .execute()
            .value

        let reports: [CreditReport] = (try? await Backend.client
            .from("client_credit_reports")
            .select("rating_label, rating_value, credit_limit, created_at")
            .eq("client_id", value: clientId)
            .order("created_at", ascending: false)
            .limit(1)
            .execute().value) ?? []
        report = reports.first
    }
}

// MARK: - Commission

struct OfferCommissionCard: View {
    let commission: Double
    let status: String?

    private var tint: Color {
        switch status {
        case "paid":    return Theme.emerald
        case "pending": return Theme.amber
        default:        return Theme.mutedForeground
        }
    }

    private var label: String {
        switch status {
        case "paid":    return "Payée"
        case "pending": return "En attente"
        case nil:       return "Non définie"
        default:        return status?.capitalized ?? "—"
        }
    }

    var body: some View {
        Card {
            HStack(spacing: 12) {
                Image(systemName: "eurosign.circle.fill")
                    .font(.system(size: 22))
                    .foregroundStyle(tint)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Commission")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.mutedForeground)
                    Text(Format.currency(commission))
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(Theme.foreground)
                }

                Spacer()

                Text(label)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(tint)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 5)
                    .background(Capsule().fill(tint.opacity(0.15)))
            }
        }
    }
}
