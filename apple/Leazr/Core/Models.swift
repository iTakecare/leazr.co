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

/// Données financières d'un mois, issues de la RPC `get_monthly_financial_data`.
struct MonthlyFinancialData: Decodable, Identifiable, Sendable {
    let monthName: String
    let monthNumber: Int
    let revenue: Double
    let directSalesRevenue: Double
    let selfLeasingRevenue: Double
    let purchases: Double
    let contractsCount: Int
    let offersCount: Int

    var id: Int { monthNumber }

    /// Le chiffre d'affaires total agrège leasing, ventes directes et
    /// self-leasing — même formule que le dashboard web.
    var totalRevenue: Double { revenue + directSalesRevenue + selfLeasingRevenue }

    enum CodingKeys: String, CodingKey {
        case monthName = "month_name"
        case monthNumber = "month_number"
        case revenue
        case directSalesRevenue = "direct_sales_revenue"
        case selfLeasingRevenue = "self_leasing_revenue"
        case purchases
        case contractsCount = "contracts_count"
        case offersCount = "offers_count"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        monthName = try c.decodeIfPresent(String.self, forKey: .monthName) ?? ""
        monthNumber = try c.decodeIfPresent(Int.self, forKey: .monthNumber) ?? 0
        revenue = try c.decodeIfPresent(Double.self, forKey: .revenue) ?? 0
        directSalesRevenue = try c.decodeIfPresent(Double.self, forKey: .directSalesRevenue) ?? 0
        selfLeasingRevenue = try c.decodeIfPresent(Double.self, forKey: .selfLeasingRevenue) ?? 0
        purchases = try c.decodeIfPresent(Double.self, forKey: .purchases) ?? 0
        contractsCount = try c.decodeIfPresent(Int.self, forKey: .contractsCount) ?? 0
        offersCount = try c.decodeIfPresent(Int.self, forKey: .offersCount) ?? 0
    }

    /// Abréviation du mois pour l'axe du graphique.
    var shortLabel: String {
        guard monthNumber >= 1, monthNumber <= 12 else { return "" }
        return ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][monthNumber - 1]
    }
}

/// Totaux annuels, calculés comme dans le web (marge = CA − achats).
struct YearTotals {
    let revenue: Double
    let purchases: Double
    let margin: Double
    let marginRate: Double
    let contracts: Int
    let offers: Int

    init(_ months: [MonthlyFinancialData]) {
        revenue = months.reduce(0) { $0 + $1.totalRevenue }
        purchases = months.reduce(0) { $0 + $1.purchases }
        margin = revenue - purchases
        marginRate = revenue > 0 ? (margin / revenue) * 100 : 0
        contracts = months.reduce(0) { $0 + $1.contractsCount }
        offers = months.reduce(0) { $0 + $1.offersCount }
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

        if let raw = try c.decodeIfPresent(String.self, forKey: .createdAt) {
            createdAt = Format.parseDate(raw)
        } else {
            createdAt = nil
        }
    }
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

    /// Postgres renvoie de l'ISO 8601 avec une précision variable sur les
    /// fractions de seconde, et parfois une simple date. On essaie les trois
    /// formes plutôt que d'en imposer une et perdre la valeur.
    static func parseDate(_ raw: String) -> Date? {
        if let d = isoWithFraction.date(from: raw) { return d }
        if let d = iso.date(from: raw) { return d }
        return dayOnly.date(from: raw)
    }

    private static let isoWithFraction: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private static let iso = ISO8601DateFormatter()

    private static let dayOnly: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()
}

// MARK: - Rappels

/// Rappel téléphonique en attente, issu de `offer_call_logs`.
///
/// Le web ne remonte que les appels sans réponse ou tombés sur messagerie dont
/// la date de rappel est échue : ce sont ceux qui demandent une action.
struct Callback: Decodable, Identifiable, Sendable {
    let id: String
    let offerId: String?
    let callbackDate: Date?
    let clientName: String

    private struct NestedOffer: Decodable {
        let clientName: String?
        let dossierNumber: String?
        enum CodingKeys: String, CodingKey {
            case clientName = "client_name"
            case dossierNumber = "dossier_number"
        }
    }

    enum CodingKeys: String, CodingKey {
        case id
        case offerId = "offer_id"
        case callbackDate = "callback_date"
        case offers
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        offerId = try c.decodeIfPresent(String.self, forKey: .offerId)

        if let raw = try c.decodeIfPresent(String.self, forKey: .callbackDate) {
            callbackDate = Format.parseDate(raw)
        } else {
            callbackDate = nil
        }

        let offer = try c.decodeIfPresent(NestedOffer.self, forKey: .offers)
        clientName = offer?.clientName ?? "Client inconnu"
    }

    /// Un rappel dont la date est passée (hors aujourd'hui) est en retard.
    var isOverdue: Bool {
        guard let callbackDate else { return false }
        return callbackDate < Calendar.current.startOfDay(for: .now)
    }
}

// MARK: - Prévisionnel

/// Statistiques de contrats par statut (`get_contract_statistics_by_status`).
struct ContractStatistics: Decodable, Sendable {
    let status: String
    let count: Int
    let totalRevenue: Double
    let totalPurchases: Double
    let totalMargin: Double

    enum CodingKeys: String, CodingKey {
        case status, count
        case totalRevenue = "total_revenue"
        case totalPurchases = "total_purchases"
        case totalMargin = "total_margin"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        status = try c.decodeIfPresent(String.self, forKey: .status) ?? ""
        count = try c.decodeIfPresent(Int.self, forKey: .count) ?? 0
        totalRevenue = try c.decodeIfPresent(Double.self, forKey: .totalRevenue) ?? 0
        totalPurchases = try c.decodeIfPresent(Double.self, forKey: .totalPurchases) ?? 0
        totalMargin = try c.decodeIfPresent(Double.self, forKey: .totalMargin) ?? 0
    }
}

// MARK: - Contrats

struct Contract: Decodable, Identifiable, Sendable {
    let id: String
    let clientName: String
    let monthlyPayment: Double
    let status: String
    let leaserName: String
    let contractNumber: String?
    let equipmentDescription: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, status
        case clientName = "client_name"
        case monthlyPayment = "monthly_payment"
        case leaserName = "leaser_name"
        case contractNumber = "contract_number"
        case equipmentDescription = "equipment_description"
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        clientName = try c.decodeIfPresent(String.self, forKey: .clientName) ?? "Client inconnu"
        monthlyPayment = try c.decodeIfPresent(Double.self, forKey: .monthlyPayment) ?? 0
        status = try c.decodeIfPresent(String.self, forKey: .status) ?? ""
        leaserName = try c.decodeIfPresent(String.self, forKey: .leaserName) ?? ""
        contractNumber = try c.decodeIfPresent(String.self, forKey: .contractNumber)
        equipmentDescription = try c.decodeIfPresent(String.self, forKey: .equipmentDescription)
        if let raw = try c.decodeIfPresent(String.self, forKey: .createdAt) {
            createdAt = Format.parseDate(raw)
        } else {
            createdAt = nil
        }
    }

    var statusLabel: String {
        switch status {
        case "contract_sent":      return "Envoyé"
        case "contract_signed":    return "Signé"
        case "equipment_ordered":  return "Commandé"
        case "delivered":          return "Livré"
        case "active":             return "Actif"
        case "completed":          return "Terminé"
        default:                   return status.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }
}

// MARK: - Clients

struct Client: Decodable, Identifiable, Sendable {
    let id: String
    let name: String
    let email: String?
    let company: String?
    let status: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, name, email, company, status
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? "Sans nom"
        email = try c.decodeIfPresent(String.self, forKey: .email)
        company = try c.decodeIfPresent(String.self, forKey: .company)
        status = try c.decodeIfPresent(String.self, forKey: .status)
        if let raw = try c.decodeIfPresent(String.self, forKey: .createdAt) {
            createdAt = Format.parseDate(raw)
        } else {
            createdAt = nil
        }
    }

    /// Initiales pour l'avatar, sans dépendre d'une image distante.
    var initials: String {
        let parts = name.split(separator: " ").prefix(2)
        return parts.compactMap { $0.first.map(String.init) }.joined().uppercased()
    }
}

// MARK: - Catalogue

struct Product: Decodable, Identifiable, Sendable {
    let id: String
    let name: String
    let price: Double
    let monthlyPrice: Double?
    let brandName: String?
    let categoryName: String?
    let imageURL: String?

    enum CodingKeys: String, CodingKey {
        case id, name, price
        case monthlyPrice = "monthly_price"
        case brandName = "brand_name"
        case categoryName = "category_name"
        case imageURL = "image_url"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? "Sans nom"
        price = try c.decodeIfPresent(Double.self, forKey: .price) ?? 0
        monthlyPrice = try c.decodeIfPresent(Double.self, forKey: .monthlyPrice)
        brandName = try c.decodeIfPresent(String.self, forKey: .brandName)
        categoryName = try c.decodeIfPresent(String.self, forKey: .categoryName)
        imageURL = try c.decodeIfPresent(String.self, forKey: .imageURL)
    }
}

// MARK: - Facturation

struct Invoice: Decodable, Identifiable, Sendable {
    let id: String
    let amount: Double
    let invoiceNumber: String?
    let leaserName: String
    let status: String?
    let invoiceDate: Date?
    let paidAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, amount, status
        case invoiceNumber = "invoice_number"
        case leaserName = "leaser_name"
        case invoiceDate = "invoice_date"
        case paidAt = "paid_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        amount = try c.decodeIfPresent(Double.self, forKey: .amount) ?? 0
        invoiceNumber = try c.decodeIfPresent(String.self, forKey: .invoiceNumber)
        leaserName = try c.decodeIfPresent(String.self, forKey: .leaserName) ?? ""
        status = try c.decodeIfPresent(String.self, forKey: .status)
        if let raw = try c.decodeIfPresent(String.self, forKey: .invoiceDate) {
            invoiceDate = Format.parseDate(raw)
        } else { invoiceDate = nil }
        if let raw = try c.decodeIfPresent(String.self, forKey: .paidAt) {
            paidAt = Format.parseDate(raw)
        } else { paidAt = nil }
    }

    var isPaid: Bool { paidAt != nil }
}

// MARK: - Équipement d'une offre

struct OfferEquipment: Decodable, Identifiable, Sendable {
    let id: String
    let title: String
    let quantity: Int
    let purchasePrice: Double
    let monthlyPayment: Double

    enum CodingKeys: String, CodingKey {
        case id, title, quantity
        case purchasePrice = "purchase_price"
        case monthlyPayment = "monthly_payment"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        title = try c.decodeIfPresent(String.self, forKey: .title) ?? "Équipement"
        quantity = try c.decodeIfPresent(Int.self, forKey: .quantity) ?? 1
        purchasePrice = try c.decodeIfPresent(Double.self, forKey: .purchasePrice) ?? 0
        monthlyPayment = try c.decodeIfPresent(Double.self, forKey: .monthlyPayment) ?? 0
    }
}

// MARK: - Création d'une offre

/// Charge utile d'insertion. `company_id` est obligatoire : les politiques RLS
/// filtrent la lecture, mais une écriture doit désigner sa société.
struct NewOffer: Encodable, Sendable {
    let companyId: String
    let clientName: String
    let clientEmail: String?
    let equipmentDescription: String?
    let amount: Double
    let monthlyPayment: Double
    let duration: Int

    enum CodingKeys: String, CodingKey {
        case companyId = "company_id"
        case clientName = "client_name"
        case clientEmail = "client_email"
        case equipmentDescription = "equipment_description"
        case amount
        case monthlyPayment = "monthly_payment"
        case duration
    }
}

// MARK: - Documents d'une offre

struct OfferDocument: Decodable, Identifiable, Sendable {
    let id: String
    let fileName: String
    let documentType: String
    let status: String
    let fileSize: Int
    let adminNotes: String?
    let uploadedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, status
        case fileName = "file_name"
        case documentType = "document_type"
        case fileSize = "file_size"
        case adminNotes = "admin_notes"
        case uploadedAt = "uploaded_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        fileName = try c.decodeIfPresent(String.self, forKey: .fileName) ?? "Document"
        documentType = try c.decodeIfPresent(String.self, forKey: .documentType) ?? ""
        status = try c.decodeIfPresent(String.self, forKey: .status) ?? "pending"
        fileSize = try c.decodeIfPresent(Int.self, forKey: .fileSize) ?? 0
        adminNotes = try c.decodeIfPresent(String.self, forKey: .adminNotes)
        if let raw = try c.decodeIfPresent(String.self, forKey: .uploadedAt) {
            uploadedAt = Format.parseDate(raw)
        } else { uploadedAt = nil }
    }

    var statusLabel: String {
        switch status {
        case "approved", "validated": return "Validé"
        case "rejected":              return "Refusé"
        case "pending":               return "À valider"
        default:                      return status.capitalized
        }
    }

    var isPending: Bool { status == "pending" }

    /// Libellé lisible du type, le web stockant des identifiants techniques.
    var typeLabel: String {
        documentType
            .replacingOccurrences(of: "_", with: " ")
            .capitalized
    }

    var readableSize: String {
        guard fileSize > 0 else { return "" }
        return ByteCountFormatter.string(fromByteCount: Int64(fileSize), countStyle: .file)
    }
}

// MARK: - Journal d'appels

struct CallLog: Decodable, Identifiable, Sendable {
    let id: String
    let status: String
    let notes: String?
    let calledAt: Date?
    let callbackDate: Date?

    enum CodingKeys: String, CodingKey {
        case id, status, notes
        case calledAt = "called_at"
        case callbackDate = "callback_date"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        status = try c.decodeIfPresent(String.self, forKey: .status) ?? ""
        notes = try c.decodeIfPresent(String.self, forKey: .notes)
        if let raw = try c.decodeIfPresent(String.self, forKey: .calledAt) {
            calledAt = Format.parseDate(raw)
        } else { calledAt = nil }
        if let raw = try c.decodeIfPresent(String.self, forKey: .callbackDate) {
            callbackDate = Format.parseDate(raw)
        } else { callbackDate = nil }
    }

    var statusLabel: String {
        switch status {
        case "answered":   return "Répondu"
        case "voicemail":  return "Messagerie"
        case "no_answer":  return "Sans réponse"
        case "busy":       return "Occupé"
        default:           return status.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }
}

// MARK: - KYC

struct KYCReport: Decodable, Identifiable, Sendable {
    let id: String
    let status: String
    let source: String
    let analyzedAt: Date?
    let errorMessage: String?

    enum CodingKeys: String, CodingKey {
        case id, status, source
        case analyzedAt = "analyzed_at"
        case errorMessage = "error_message"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        status = try c.decodeIfPresent(String.self, forKey: .status) ?? ""
        source = try c.decodeIfPresent(String.self, forKey: .source) ?? ""
        errorMessage = try c.decodeIfPresent(String.self, forKey: .errorMessage)
        if let raw = try c.decodeIfPresent(String.self, forKey: .analyzedAt) {
            analyzedAt = Format.parseDate(raw)
        } else { analyzedAt = nil }
    }

    var statusLabel: String {
        switch status {
        case "completed", "analyzed": return "Analysé"
        case "processing":            return "En cours"
        case "failed", "error":       return "Échec"
        case "pending":               return "En attente"
        default:                      return status.capitalized
        }
    }
}

// MARK: - Support

struct SupportTicket: Decodable, Identifiable, Sendable {
    let id: String
    let subject: String
    let status: String
    let priority: String
    let category: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, subject, status, priority, category
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        subject = try c.decodeIfPresent(String.self, forKey: .subject) ?? "Sans objet"
        status = try c.decodeIfPresent(String.self, forKey: .status) ?? ""
        priority = try c.decodeIfPresent(String.self, forKey: .priority) ?? ""
        category = try c.decodeIfPresent(String.self, forKey: .category)
        if let raw = try c.decodeIfPresent(String.self, forKey: .createdAt) {
            createdAt = Format.parseDate(raw)
        } else { createdAt = nil }
    }

    var statusLabel: String {
        switch status {
        case "open":        return "Ouvert"
        case "in_progress": return "En cours"
        case "resolved":    return "Résolu"
        case "closed":      return "Fermé"
        default:            return status.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    var priorityLabel: String {
        switch priority {
        case "urgent": return "Urgent"
        case "high":   return "Haute"
        case "medium": return "Moyenne"
        case "low":    return "Basse"
        default:       return priority.capitalized
        }
    }
}

// MARK: - Workflow

/// Étape de workflow, paramétrable par société via `workflow_templates`
/// et `workflow_steps`. L'app ne code donc aucun processus en dur : elle
/// affiche celui que la société a configuré dans le web.
struct WorkflowStep: Decodable, Identifiable, Sendable {
    let id: String
    let stepKey: String
    let stepLabel: String
    let stepDescription: String?
    let stepOrder: Int
    let isRequired: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case stepKey = "step_key"
        case stepLabel = "step_label"
        case stepDescription = "step_description"
        case stepOrder = "step_order"
        case isRequired = "is_required"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        stepKey = try c.decodeIfPresent(String.self, forKey: .stepKey) ?? ""
        stepLabel = try c.decodeIfPresent(String.self, forKey: .stepLabel) ?? ""
        stepDescription = try c.decodeIfPresent(String.self, forKey: .stepDescription)
        stepOrder = try c.decodeIfPresent(Int.self, forKey: .stepOrder) ?? 0
        isRequired = try c.decodeIfPresent(Bool.self, forKey: .isRequired) ?? false
    }
}

struct WorkflowTemplate: Decodable, Identifiable, Sendable {
    let id: String
    let name: String
    let offerType: String

    enum CodingKeys: String, CodingKey {
        case id, name
        case offerType = "offer_type"
    }
}

// MARK: - Équipement sérialisé

/// Le web stocke `equipment_description` sous forme de tableau JSON, pas de
/// texte. L'afficher brut donnait un mur de JSON illisible : on le décode ici,
/// avec repli sur du texte simple pour les anciens dossiers.
struct EquipmentItem: Decodable, Identifiable, Sendable {
    let id: String
    let title: String
    let quantity: Int
    let purchasePrice: Double
    let monthlyPayment: Double
    let attributes: [String: String]

    private enum CodingKeys: String, CodingKey {
        case id, title, quantity, purchasePrice, monthlyPayment, attributes
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = (try? c.decode(String.self, forKey: .id)) ?? UUID().uuidString
        title = (try? c.decode(String.self, forKey: .title)) ?? "Équipement"
        quantity = (try? c.decode(Int.self, forKey: .quantity)) ?? 1
        purchasePrice = (try? c.decode(Double.self, forKey: .purchasePrice)) ?? 0
        monthlyPayment = (try? c.decode(Double.self, forKey: .monthlyPayment)) ?? 0

        // Les attributs mélangent chaînes et nombres selon les fiches produit.
        if let raw = try? c.decode([String: AnyCodableValue].self, forKey: .attributes) {
            attributes = raw.mapValues(\.description)
        } else {
            attributes = [:]
        }
    }

    /// Décode une description d'équipement, quelle que soit sa forme.
    /// Renvoie `nil` si le contenu n'est pas du JSON exploitable — l'appelant
    /// affiche alors le texte tel quel.
    static func parse(_ raw: String?) -> [EquipmentItem]? {
        guard let raw, let data = raw.data(using: .utf8) else { return nil }
        guard let items = try? JSONDecoder().decode([EquipmentItem].self, from: data),
              !items.isEmpty
        else { return nil }
        return items
    }
}

/// Valeur JSON hétérogène réduite à sa représentation textuelle.
private struct AnyCodableValue: Decodable, CustomStringConvertible {
    let description: String

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let s = try? c.decode(String.self) { description = s }
        else if let i = try? c.decode(Int.self) { description = String(i) }
        else if let d = try? c.decode(Double.self) { description = String(d) }
        else if let b = try? c.decode(Bool.self) { description = b ? "Oui" : "Non" }
        else { description = "" }
    }
}

// MARK: - Journal de workflow

struct WorkflowLog: Decodable, Identifiable, Sendable {
    let id: String
    let previousStatus: String
    let newStatus: String
    let reason: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, reason
        case previousStatus = "previous_status"
        case newStatus = "new_status"
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        previousStatus = try c.decodeIfPresent(String.self, forKey: .previousStatus) ?? ""
        newStatus = try c.decodeIfPresent(String.self, forKey: .newStatus) ?? ""
        reason = try c.decodeIfPresent(String.self, forKey: .reason)
        if let raw = try c.decodeIfPresent(String.self, forKey: .createdAt) {
            createdAt = Format.parseDate(raw)
        } else { createdAt = nil }
    }
}

/// Score dérivé du statut, repris à l'identique du service web
/// (`offerStatus.ts`) : c'est une règle métier, elle ne doit pas diverger.
enum WorkflowScoring {
    static func scoreUpdate(for status: String) -> (field: String, value: String)? {
        switch status {
        case "internal_approved":       return ("internal_score", "A")
        case "leaser_approved":         return ("leaser_score", "A")
        case "internal_docs_requested": return ("internal_score", "B")
        case "leaser_docs_requested":   return ("leaser_score", "B")
        case "internal_rejected":       return ("internal_score", "C")
        case "leaser_rejected":         return ("leaser_score", "C")
        case "without_follow_up":       return ("internal_score", "D")
        default:                        return nil
        }
    }
}
