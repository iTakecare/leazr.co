import Foundation
import SwiftUI

// MARK: - Étapes du pipeline

/// Colonne du pipeline commercial. Elle porte sa propre couleur, définie par
/// l'administrateur : on la respecte plutôt que d'en inventer une.
struct PipelineStage: Decodable, Identifiable, Sendable {
    let id: String
    let key: String
    let label: String
    let position: Int
    let probability: Int
    let colorHex: String?
    let isWon: Bool
    let isLost: Bool
    let isDefault: Bool

    static let columns = "id, key, label, position, probability, color, is_won, is_lost, is_default"

    enum CodingKeys: String, CodingKey {
        case id, key, label, position, probability
        case colorHex = "color"
        case isWon = "is_won"
        case isLost = "is_lost"
        case isDefault = "is_default"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        key = try c.decodeIfPresent(String.self, forKey: .key) ?? ""
        label = try c.decodeIfPresent(String.self, forKey: .label) ?? ""
        position = try c.decodeIfPresent(Int.self, forKey: .position) ?? 0
        probability = try c.decodeIfPresent(Int.self, forKey: .probability) ?? 0
        colorHex = try c.decodeIfPresent(String.self, forKey: .colorHex)
        isWon = try c.decodeIfPresent(Bool.self, forKey: .isWon) ?? false
        isLost = try c.decodeIfPresent(Bool.self, forKey: .isLost) ?? false
        isDefault = try c.decodeIfPresent(Bool.self, forKey: .isDefault) ?? false
    }

    var color: Color {
        if isWon { return Theme.emerald }
        if isLost { return Theme.destructive }
        return Color(hex: colorHex) ?? Theme.violet
    }
}

extension Color {
    /// Les étapes stockent leur couleur en hexadécimal Tailwind (`#94a3b8`).
    init?(hex: String?) {
        guard var hex else { return nil }
        hex = hex.trimmingCharacters(in: .whitespaces)
        if hex.hasPrefix("#") { hex.removeFirst() }
        guard hex.count == 6, let value = UInt32(hex, radix: 16) else { return nil }
        self.init(
            red: Double((value >> 16) & 0xFF) / 255,
            green: Double((value >> 8) & 0xFF) / 255,
            blue: Double(value & 0xFF) / 255
        )
    }
}

// MARK: - Affaires

struct Opportunity: Decodable, Identifiable, Sendable {
    let id: String
    let name: String
    let description: String?
    let clientId: String?
    let stageId: String?
    let status: String
    let source: String?
    let estimatedMonthlyPayment: Double?
    let estimatedAmount: Double?
    let expectedCloseDate: Date?
    let nextActionAt: Date?
    let nextActionChannel: String?
    let nextActionNote: String?
    let lastActivityAt: Date?
    let lostReason: String?
    let lostReasonDetail: String?
    let intentScore: Int?
    let tags: [String]
    let createdAt: Date?
    let updatedAt: Date?

    /// Relations remontées en une requête : sans elles, la liste ferait une
    /// requête par ligne pour afficher un nom de client.
    let stage: PipelineStage?
    let client: OpportunityClient?

    static let columns = """
        id, name, description, client_id, stage_id, status, source, \
        estimated_monthly_payment, estimated_amount, expected_close_date, \
        next_action_at, next_action_channel, next_action_note, last_activity_at, \
        lost_reason, lost_reason_detail, intent_score, tags, created_at, updated_at, \
        stage:pipeline_stages!opportunities_stage_id_fkey (\(PipelineStage.columns)), \
        client:clients!opportunities_client_id_fkey (id, name, company, email, phone, \
        vat_number, address, postal_code, city, country)
        """

    enum CodingKeys: String, CodingKey {
        case id, name, description, status, source, tags, stage, client
        case clientId = "client_id"
        case stageId = "stage_id"
        case estimatedMonthlyPayment = "estimated_monthly_payment"
        case estimatedAmount = "estimated_amount"
        case expectedCloseDate = "expected_close_date"
        case nextActionAt = "next_action_at"
        case nextActionChannel = "next_action_channel"
        case nextActionNote = "next_action_note"
        case lastActivityAt = "last_activity_at"
        case lostReason = "lost_reason"
        case lostReasonDetail = "lost_reason_detail"
        case intentScore = "intent_score"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? "Affaire"
        description = try c.decodeIfPresent(String.self, forKey: .description)
        clientId = try c.decodeIfPresent(String.self, forKey: .clientId)
        stageId = try c.decodeIfPresent(String.self, forKey: .stageId)
        status = try c.decodeIfPresent(String.self, forKey: .status) ?? "open"
        source = try c.decodeIfPresent(String.self, forKey: .source)
        estimatedMonthlyPayment = try c.decodeIfPresent(Double.self, forKey: .estimatedMonthlyPayment)
        estimatedAmount = try c.decodeIfPresent(Double.self, forKey: .estimatedAmount)
        nextActionChannel = try c.decodeIfPresent(String.self, forKey: .nextActionChannel)
        nextActionNote = try c.decodeIfPresent(String.self, forKey: .nextActionNote)
        lostReason = try c.decodeIfPresent(String.self, forKey: .lostReason)
        lostReasonDetail = try c.decodeIfPresent(String.self, forKey: .lostReasonDetail)
        intentScore = try c.decodeIfPresent(Int.self, forKey: .intentScore)
        tags = try c.decodeIfPresent([String].self, forKey: .tags) ?? []
        stage = try c.decodeIfPresent(PipelineStage.self, forKey: .stage)
        client = try c.decodeIfPresent(OpportunityClient.self, forKey: .client)

        func date(_ key: CodingKeys) throws -> Date? {
            guard let raw = try c.decodeIfPresent(String.self, forKey: key) else { return nil }
            return Format.parseDate(raw)
        }
        expectedCloseDate = try date(.expectedCloseDate)
        nextActionAt = try date(.nextActionAt)
        lastActivityAt = try date(.lastActivityAt)
        createdAt = try date(.createdAt)
        updatedAt = try date(.updatedAt)
    }

    /// L'action suivante est-elle échue ? C'est le seul signal qui distingue
    /// une affaire suivie d'une affaire oubliée.
    var isOverdue: Bool {
        guard status == "open", let nextActionAt else { return false }
        return nextActionAt < Date()
    }

    var statusLabel: String {
        switch status {
        case "won":  return "Gagnée"
        case "lost": return "Perdue"
        default:     return "En cours"
        }
    }

    var statusTint: Color {
        switch status {
        case "won":  return Theme.emerald
        case "lost": return Theme.destructive
        default:     return Theme.primary
        }
    }
}

/// Coordonnées du client rattachées à l'affaire. Le web les affiche sur la
/// fiche : sans elles, impossible d'appeler depuis le terrain.
struct OpportunityClient: Decodable, Sendable {
    let id: String
    let name: String
    let company: String?
    let email: String?
    let phone: String?
    let vatNumber: String?
    let address: String?
    let postalCode: String?
    let city: String?
    let country: String?

    enum CodingKeys: String, CodingKey {
        case id, name, company, email, phone, address, city, country
        case vatNumber = "vat_number"
        case postalCode = "postal_code"
    }

    var fullAddress: String? {
        let parts = [address, [postalCode, city].compactMap { $0 }.joined(separator: " "), country]
            .compactMap { $0 }
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }
}

// MARK: - Activités

struct CRMActivity: Decodable, Identifiable, Sendable {
    let id: String
    let type: String
    let direction: String?
    let channel: String?
    let occurredAt: Date?
    let actorLabel: String?
    let subject: String?
    let body: String?
    let outcome: String?

    static let columns = "id, type, direction, channel, occurred_at, actor_label, subject, body, outcome"

    enum CodingKeys: String, CodingKey {
        case id, type, direction, channel, subject, body, outcome
        case occurredAt = "occurred_at"
        case actorLabel = "actor_label"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        type = try c.decodeIfPresent(String.self, forKey: .type) ?? "note"
        direction = try c.decodeIfPresent(String.self, forKey: .direction)
        channel = try c.decodeIfPresent(String.self, forKey: .channel)
        actorLabel = try c.decodeIfPresent(String.self, forKey: .actorLabel)
        subject = try c.decodeIfPresent(String.self, forKey: .subject)
        body = try c.decodeIfPresent(String.self, forKey: .body)
        outcome = try c.decodeIfPresent(String.self, forKey: .outcome)
        if let raw = try c.decodeIfPresent(String.self, forKey: .occurredAt) {
            occurredAt = Format.parseDate(raw)
        } else { occurredAt = nil }
    }

    var typeLabel: String { CRMVocabulary.activityLabel(type) }
    var icon: String { CRMVocabulary.activityIcon(type) }
    var tint: Color { CRMVocabulary.activityTint(type) }
}

// MARK: - Vocabulaire

/// Libellés repris de `src/services/crm/types.ts`, pour que les deux
/// applications nomment les mêmes choses de la même façon.
enum CRMVocabulary {

    static let channels: [(code: String, label: String)] = [
        ("call", "Appel"),
        ("email", "Email"),
        ("whatsapp", "WhatsApp"),
        ("sms", "SMS"),
        ("meeting", "Rendez-vous"),
        ("linkedin", "LinkedIn"),
        ("voice_ai", "Appel Alex (IA)"),
        ("other", "Autre"),
    ]

    static let sources: [(code: String, label: String)] = [
        ("recommendation", "Recommandation"),
        ("google", "Google"),
        ("meta", "Meta (Facebook / Instagram)"),
        ("linkedin", "LinkedIn"),
        ("existing_client", "Client existant"),
        ("website", "Site web"),
        ("event", "Salon / événement"),
        ("outbound", "Prospection sortante"),
        ("other", "Autre"),
    ]

    static let lostReasons: [(code: String, label: String)] = [
        ("no_budget", "Pas de budget"),
        ("no_need", "Pas de besoin"),
        ("competitor", "Parti chez un concurrent"),
        ("financing_refused", "Financement refusé"),
        ("no_response", "Jamais réussi à joindre"),
        ("timing", "Mauvais timing"),
        ("price", "Prix trop élevé"),
        ("other", "Autre"),
    ]

    /// Types d'activité que l'on peut consigner à la main. Les autres
    /// (`stage_change`, `sequence`, `system`) sont écrits par le serveur.
    static let loggableTypes: [(code: String, label: String)] = [
        ("call", "Appel"),
        ("email", "Email"),
        ("whatsapp", "WhatsApp"),
        ("sms", "SMS"),
        ("meeting", "Rendez-vous"),
        ("note", "Note"),
        ("task", "Tâche"),
    ]

    static func channelLabel(_ code: String?) -> String {
        guard let code else { return "—" }
        return channels.first { $0.code == code }?.label ?? code.capitalized
    }

    static func sourceLabel(_ code: String?) -> String {
        guard let code, !code.isEmpty else { return "—" }
        return sources.first { $0.code == code }?.label ?? code.capitalized
    }

    static func lostReasonLabel(_ code: String?) -> String {
        guard let code, !code.isEmpty else { return "—" }
        return lostReasons.first { $0.code == code }?.label ?? code.capitalized
    }

    static func activityLabel(_ type: String) -> String {
        switch type {
        case "call":         return "Appel"
        case "email":        return "Email"
        case "whatsapp":     return "WhatsApp"
        case "sms":          return "SMS"
        case "meeting":      return "Rendez-vous"
        case "note":         return "Note"
        case "task":         return "Tâche"
        case "stage_change": return "Changement d'étape"
        case "document":     return "Document"
        case "voice_ai":     return "Appel Alex"
        case "sequence":     return "Séquence"
        case "system":       return "Système"
        default:             return type.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    static func activityIcon(_ type: String) -> String {
        switch type {
        case "call", "voice_ai": return "phone.fill"
        case "email":            return "envelope.fill"
        case "whatsapp", "sms":  return "message.fill"
        case "meeting":          return "calendar"
        case "note":             return "note.text"
        case "task":             return "checkmark.circle"
        case "stage_change":     return "arrow.right.circle.fill"
        case "document":         return "doc.fill"
        case "sequence":         return "arrow.triangle.branch"
        default:                 return "clock"
        }
    }

    static func activityTint(_ type: String) -> Color {
        switch type {
        case "call", "voice_ai": return Theme.violet
        case "email":            return Theme.sky
        case "whatsapp", "sms":  return Theme.emerald
        case "meeting":          return Theme.amber
        case "stage_change":     return Theme.primary
        case "document":         return Theme.teal
        default:                 return Theme.mutedForeground
        }
    }
}
