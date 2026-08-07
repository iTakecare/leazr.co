import Foundation

/// Indicateurs du tableau de bord.
///
/// Alimenté par la fonction RPC `get_company_dashboard_metrics`, la même que
/// celle du web : le calcul reste côté serveur, l'app native ne réimplémente
/// aucune règle métier.
struct DashboardMetrics: Decodable, Sendable {
    let totalRevenue: Double
    let totalClients: Int
    let totalOffers: Int
    let totalContracts: Int
    let pendingOffers: Int
    let activeContracts: Int
    let recentSignups: Int

    enum CodingKeys: String, CodingKey {
        case totalRevenue = "total_revenue"
        case totalClients = "total_clients"
        case totalOffers = "total_offers"
        case totalContracts = "total_contracts"
        case pendingOffers = "pending_offers"
        case activeContracts = "active_contracts"
        case recentSignups = "recent_signups"
    }

    /// Les agrégats SQL peuvent remonter `null` sur une base vide.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        totalRevenue = try c.decodeIfPresent(Double.self, forKey: .totalRevenue) ?? 0
        totalClients = try c.decodeIfPresent(Int.self, forKey: .totalClients) ?? 0
        totalOffers = try c.decodeIfPresent(Int.self, forKey: .totalOffers) ?? 0
        totalContracts = try c.decodeIfPresent(Int.self, forKey: .totalContracts) ?? 0
        pendingOffers = try c.decodeIfPresent(Int.self, forKey: .pendingOffers) ?? 0
        activeContracts = try c.decodeIfPresent(Int.self, forKey: .activeContracts) ?? 0
        recentSignups = try c.decodeIfPresent(Int.self, forKey: .recentSignups) ?? 0
    }
}

/// Une offre, dans sa forme de liste.
struct Offer: Decodable, Identifiable, Sendable {
    let id: String
    let clientName: String
    let amount: Double
    let monthlyPayment: Double
    let status: String
    let dossierNumber: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case clientName = "client_name"
        case amount
        case monthlyPayment = "monthly_payment"
        case status
        case dossierNumber = "dossier_number"
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        clientName = try c.decodeIfPresent(String.self, forKey: .clientName) ?? "Client inconnu"
        amount = try c.decodeIfPresent(Double.self, forKey: .amount) ?? 0
        monthlyPayment = try c.decodeIfPresent(Double.self, forKey: .monthlyPayment) ?? 0
        status = try c.decodeIfPresent(String.self, forKey: .status) ?? "draft"
        dossierNumber = try c.decodeIfPresent(String.self, forKey: .dossierNumber)

        // Postgres renvoie de l'ISO 8601 avec une précision variable sur les
        // fractions de seconde : on tente les deux formes plutôt que d'imposer
        // un format et perdre la date.
        if let raw = try c.decodeIfPresent(String.self, forKey: .createdAt) {
            createdAt = Self.isoWithFraction.date(from: raw) ?? Self.iso.date(from: raw)
        } else {
            createdAt = nil
        }
    }

    private static let isoWithFraction: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private static let iso = ISO8601DateFormatter()
}

// MARK: - Présentation

extension Offer {
    /// Libellé lisible du statut, aligné sur le vocabulaire du web.
    var statusLabel: String {
        switch status {
        case "draft":     return "Brouillon"
        case "sent":      return "Envoyée"
        case "accepted":  return "Acceptée"
        case "signed":    return "Signée"
        case "rejected":  return "Refusée"
        case "pending":   return "En attente"
        case "financed":  return "Financée"
        default:          return status.capitalized
        }
    }
}

// MARK: - Formatage

enum Format {
    /// Montants en euros, séparateurs français.
    static func currency(_ value: Double) -> String {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "EUR"
        f.locale = Locale(identifier: "fr_BE")
        f.maximumFractionDigits = value >= 1000 ? 0 : 2
        return f.string(from: NSNumber(value: value)) ?? "—"
    }

    static func date(_ value: Date?) -> String {
        guard let value else { return "—" }
        let f = DateFormatter()
        f.locale = Locale(identifier: "fr_BE")
        f.dateStyle = .medium
        f.timeStyle = .none
        return f.string(from: value)
    }
}
