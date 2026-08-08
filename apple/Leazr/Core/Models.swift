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
    ///
    /// Trois lettres, pas une : Swift Charts regroupe les catégories de même
    /// libellé, si bien que « M » fusionnait Mars et Mai, et « J » Janvier,
    /// Juin et Juillet.
    var shortLabel: String {
        guard monthNumber >= 1, monthNumber <= 12 else { return "" }
        return ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
                "Juil", "Août", "Sep", "Oct", "Nov", "Déc"][monthNumber - 1]
    }

    var margin: Double { totalRevenue - purchases }
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
    /// Étape dans le workflow de la société. Distincte de `status`, qui reste
    /// le statut commercial : c'est elle que suit le visualiseur du web.
    let workflowStatus: String?
    let dossierNumber: String?
    let createdAt: Date?

    /// Type de demande (`admin_offer`, `client_request`, `web_request`) et
    /// source (`meta`, …) : ce sont les deux axes de filtrage du web.
    let type: String?
    let source: String?
    /// Motif de refus, affiché dans l'onglet « Refusées ».
    let rejectionCategory: String?
    /// Modèle de workflow imposé au dossier, prioritaire sur celui déduit du type.
    let workflowTemplateId: String?
    let isPurchase: Bool
    let internalScore: String?
    let leaserScore: String?
    let clientId: String?

    /// Colonnes à demander pour construire une liste d'offres filtrable.
    static let listColumns = """
        id, client_name, amount, monthly_payment, status, workflow_status, \
        dossier_number, created_at, type, source, rejection_category, \
        workflow_template_id, is_purchase, internal_score, leaser_score, client_id
        """

    enum CodingKeys: String, CodingKey {
        case id, amount, status, type, source
        case clientName = "client_name"
        case monthlyPayment = "monthly_payment"
        case workflowStatus = "workflow_status"
        case dossierNumber = "dossier_number"
        case createdAt = "created_at"
        case rejectionCategory = "rejection_category"
        case workflowTemplateId = "workflow_template_id"
        case isPurchase = "is_purchase"
        case internalScore = "internal_score"
        case leaserScore = "leaser_score"
        case clientId = "client_id"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        clientName = try c.decodeIfPresent(String.self, forKey: .clientName) ?? "Client inconnu"
        amount = try c.decodeIfPresent(Double.self, forKey: .amount) ?? 0
        monthlyPayment = try c.decodeIfPresent(Double.self, forKey: .monthlyPayment) ?? 0
        status = try c.decodeIfPresent(String.self, forKey: .status) ?? "draft"
        workflowStatus = try c.decodeIfPresent(String.self, forKey: .workflowStatus)
        dossierNumber = try c.decodeIfPresent(String.self, forKey: .dossierNumber)
        type = try c.decodeIfPresent(String.self, forKey: .type)
        source = try c.decodeIfPresent(String.self, forKey: .source)
        rejectionCategory = try c.decodeIfPresent(String.self, forKey: .rejectionCategory)
        workflowTemplateId = try c.decodeIfPresent(String.self, forKey: .workflowTemplateId)
        isPurchase = try c.decodeIfPresent(Bool.self, forKey: .isPurchase) ?? false
        internalScore = try c.decodeIfPresent(String.self, forKey: .internalScore)
        leaserScore = try c.decodeIfPresent(String.self, forKey: .leaserScore)
        clientId = try c.decodeIfPresent(String.self, forKey: .clientId)

        if let raw = try c.decodeIfPresent(String.self, forKey: .createdAt) {
            createdAt = Format.parseDate(raw)
        } else {
            createdAt = nil
        }
    }
}

// MARK: - Présentation

extension Offer {
    /// Étape courante : le workflow prime, avec repli sur le statut. C'est
    /// cette valeur que le web affiche et sur laquelle il filtre.
    var currentStep: String {
        let step = workflowStatus?.trimmingCharacters(in: .whitespaces) ?? ""
        return step.isEmpty ? status : step
    }

    /// Libellé lisible du statut, issu du catalogue partagé avec le web.
    var statusLabel: String { OfferStatus.label(currentStep) }

    var typeLabel: String {
        switch type {
        case "admin_offer":    return "Ma demande"
        case "client_request": return "Demande client"
        case "web_request":    return "Demande web"
        case "ambassador_offer": return "Ambassadeur"
        case "partner_offer":  return "Partenaire"
        case let other?:       return other.replacingOccurrences(of: "_", with: " ").capitalized
        case nil:              return "Demande"
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

    /// Date et heure — indispensable pour un horodatage de signature, où la
    /// seule date ne suffit pas à établir la chronologie.
    static func dateTime(_ value: Date?) -> String {
        guard let value else { return "—" }
        let f = DateFormatter()
        f.locale = Locale(identifier: "fr_BE")
        f.dateStyle = .medium
        f.timeStyle = .short
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
    /// Durée et date de début : servent aux filtres avancés de la liste.
    let contractDuration: Int?
    let contractStartDate: Date?

    enum CodingKeys: String, CodingKey {
        case id, status
        case clientName = "client_name"
        case monthlyPayment = "monthly_payment"
        case leaserName = "leaser_name"
        case contractNumber = "contract_number"
        case equipmentDescription = "equipment_description"
        case createdAt = "created_at"
        case contractDuration = "contract_duration"
        case contractStartDate = "contract_start_date"
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
        contractDuration = try c.decodeIfPresent(Int.self, forKey: .contractDuration)
        if let raw = try c.decodeIfPresent(String.self, forKey: .createdAt) {
            createdAt = Format.parseDate(raw)
        } else {
            createdAt = nil
        }
        if let raw = try c.decodeIfPresent(String.self, forKey: .contractStartDate) {
            contractStartDate = Format.parseDate(raw)
        } else {
            contractStartDate = nil
        }
    }

    var statusLabel: String { ContractWorkflow.label(status)
    }
}

// MARK: - Clients

struct Client: Decodable, Identifiable, Sendable {
    let id: String
    let name: String
    let email: String?
    let company: String?
    let status: String?
    let phone: String?
    let contactName: String?
    let vatNumber: String?
    let address: String?
    let city: String?
    let postalCode: String?
    let country: String?
    let notes: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, name, email, company, status, phone, address, city, country, notes
        case contactName = "contact_name"
        case vatNumber = "vat_number"
        case postalCode = "postal_code"
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? "Sans nom"
        email = try c.decodeIfPresent(String.self, forKey: .email)
        company = try c.decodeIfPresent(String.self, forKey: .company)
        status = try c.decodeIfPresent(String.self, forKey: .status)
        phone = try c.decodeIfPresent(String.self, forKey: .phone)
        contactName = try c.decodeIfPresent(String.self, forKey: .contactName)
        vatNumber = try c.decodeIfPresent(String.self, forKey: .vatNumber)
        address = try c.decodeIfPresent(String.self, forKey: .address)
        city = try c.decodeIfPresent(String.self, forKey: .city)
        postalCode = try c.decodeIfPresent(String.self, forKey: .postalCode)
        country = try c.decodeIfPresent(String.self, forKey: .country)
        notes = try c.decodeIfPresent(String.self, forKey: .notes)
        if let raw = try c.decodeIfPresent(String.self, forKey: .createdAt) {
            createdAt = Format.parseDate(raw)
        } else { createdAt = nil }
    }

    /// Adresse postale sur une ligne, pour affichage et ouverture dans Plans.
    var fullAddress: String? {
        let parts = [address, [postalCode, city].compactMap { $0 }.joined(separator: " "), country]
            .compactMap { $0 }
            .filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
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
    /// Marge en pourcentage appliquée au prix d'achat.
    let margin: Double
    /// Prix de vente **unitaire** — la base stocke l'unitaire ici, alors que
    /// `monthly_payment` est le total de la ligne. Confondre les deux fausse
    /// tous les recalculs.
    let sellingPrice: Double
    let serialNumber: String?

    static let columns = """
        id, title, quantity, purchase_price, monthly_payment, margin, \
        selling_price, serial_number
        """

    enum CodingKeys: String, CodingKey {
        case id, title, quantity, margin
        case purchasePrice = "purchase_price"
        case monthlyPayment = "monthly_payment"
        case sellingPrice = "selling_price"
        case serialNumber = "serial_number"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        title = try c.decodeIfPresent(String.self, forKey: .title) ?? "Équipement"
        quantity = try c.decodeIfPresent(Int.self, forKey: .quantity) ?? 1
        purchasePrice = try c.decodeIfPresent(Double.self, forKey: .purchasePrice) ?? 0
        monthlyPayment = try c.decodeIfPresent(Double.self, forKey: .monthlyPayment) ?? 0
        margin = try c.decodeIfPresent(Double.self, forKey: .margin) ?? 0
        sellingPrice = try c.decodeIfPresent(Double.self, forKey: .sellingPrice) ?? 0
        serialNumber = try c.decodeIfPresent(String.self, forKey: .serialNumber)
    }
}

// MARK: - Création d'une offre

/// Charge utile d'insertion. `company_id` est obligatoire : les politiques RLS
/// filtrent la lecture, mais une écriture doit désigner sa société.
struct NewOffer: Encodable, Sendable {
    let companyId: String
    let clientId: String?
    let clientName: String
    let clientEmail: String?
    let equipmentDescription: String?
    let amount: Double
    let monthlyPayment: Double
    let coefficient: Double
    let duration: Int
    let estimatedBudget: Double?
    let discountValue: Double?

    enum CodingKeys: String, CodingKey {
        case companyId = "company_id"
        case clientId = "client_id"
        case clientName = "client_name"
        case clientEmail = "client_email"
        case equipmentDescription = "equipment_description"
        case amount
        case monthlyPayment = "monthly_payment"
        case coefficient
        case duration
        case estimatedBudget = "estimated_budget"
        case discountValue = "discount_value"
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
    let isVisible: Bool

    /// Une étape de scoring ouvre l'analyse (interne ou leaser) : c'est là que
    /// le web propose les scores A/B/C/D plutôt qu'un simple changement d'étape.
    let enablesScoring: Bool
    let scoringType: String?

    /// Destinations configurées par l'administrateur. Elles priment sur les
    /// statuts par défaut (`internal_approved`…) quand elles sont renseignées.
    let nextStepOnApproval: String?
    let nextStepOnRejection: String?
    let nextStepOnDocsRequested: String?

    enum CodingKeys: String, CodingKey {
        case id
        case stepKey = "step_key"
        case stepLabel = "step_label"
        case stepDescription = "step_description"
        case stepOrder = "step_order"
        case isRequired = "is_required"
        case isVisible = "is_visible"
        case enablesScoring = "enables_scoring"
        case scoringType = "scoring_type"
        case nextStepOnApproval = "next_step_on_approval"
        case nextStepOnRejection = "next_step_on_rejection"
        case nextStepOnDocsRequested = "next_step_on_docs_requested"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        // La RPC `get_workflow_for_offer_type` ne renvoie pas d'`id` de ligne :
        // la clé d'étape identifie déjà l'élément de façon stable.
        id = (try? c.decode(String.self, forKey: .id))
            ?? (try? c.decode(String.self, forKey: .stepKey))
            ?? UUID().uuidString
        stepKey = try c.decodeIfPresent(String.self, forKey: .stepKey) ?? ""
        stepLabel = try c.decodeIfPresent(String.self, forKey: .stepLabel) ?? ""
        stepDescription = try c.decodeIfPresent(String.self, forKey: .stepDescription)
        stepOrder = try c.decodeIfPresent(Int.self, forKey: .stepOrder) ?? 0
        isRequired = try c.decodeIfPresent(Bool.self, forKey: .isRequired) ?? false
        isVisible = try c.decodeIfPresent(Bool.self, forKey: .isVisible) ?? true
        enablesScoring = try c.decodeIfPresent(Bool.self, forKey: .enablesScoring) ?? false
        scoringType = try c.decodeIfPresent(String.self, forKey: .scoringType)
        nextStepOnApproval = try c.decodeIfPresent(String.self, forKey: .nextStepOnApproval)
        nextStepOnRejection = try c.decodeIfPresent(String.self, forKey: .nextStepOnRejection)
        nextStepOnDocsRequested = try c.decodeIfPresent(String.self, forKey: .nextStepOnDocsRequested)
    }
}

/// Modèle de secours quand la société n'a pas de workflow configuré, repris de
/// `defaultSteps` dans `LeazrWorkflowStepper.tsx`.
extension WorkflowStep {
    static let defaults: [WorkflowStep] = [
        make("draft", "Brouillon", 1),
        make("internal_review", "Analyse interne", 2, scoring: "internal"),
        make("sent", "Offre envoyée", 3),
        make("leaser_review", "Analyse Leaser", 4, scoring: "leaser"),
        make("validated", "Contrat prêt", 5),
    ]

    private static func make(
        _ key: String,
        _ label: String,
        _ order: Int,
        scoring: String? = nil
    ) -> WorkflowStep {
        let json = """
        {"id":"\(key)","step_key":"\(key)","step_label":"\(label)","step_order":\(order),
         "is_required":true,"is_visible":true,"enables_scoring":\(scoring != nil),
         "scoring_type":\(scoring.map { "\"\($0)\"" } ?? "null")}
        """
        // Forcé : le littéral est fixe et valide, une erreur ici serait un bug
        // de compilation déguisé.
        return try! JSONDecoder().decode(WorkflowStep.self, from: Data(json.utf8))
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

// MARK: - Bailleurs et coefficients

struct Leaser: Decodable, Identifiable, Sendable {
    let id: String
    let name: String
    let availableDurations: [Int]?

    enum CodingKeys: String, CodingKey {
        case id, name
        case availableDurations = "available_durations"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? "Bailleur"
        availableDurations = try c.decodeIfPresent([Int].self, forKey: .availableDurations)
    }

    var durations: [Int] {
        let d = availableDurations ?? []
        return d.isEmpty ? [12, 24, 36, 48, 60] : d.sorted()
    }
}

struct LeaserRange: Decodable, Identifiable, Sendable {
    let id: String
    let min: Double
    let max: Double
    let coefficient: Double
    let durationMonths: Int

    enum CodingKeys: String, CodingKey {
        case id, min, max, coefficient
        case durationMonths = "duration_months"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        min = try c.decodeIfPresent(Double.self, forKey: .min) ?? 0
        max = try c.decodeIfPresent(Double.self, forKey: .max) ?? 0
        coefficient = try c.decodeIfPresent(Double.self, forKey: .coefficient) ?? 0
        durationMonths = try c.decodeIfPresent(Int.self, forKey: .durationMonths) ?? 36
    }
}

/// Calcul de la mensualité, repris du web (`leaserCalculator.ts` et
/// `calculator.ts`). C'est une règle métier : elle doit rester identique des
/// deux côtés, sous peine de proposer des montants différents au même client.
enum Financing {

    /// Coefficient de repli quand aucun barème ne correspond, comme le web.
    static let fallbackCoefficient = 3.16

    /// Cherche la tranche qui contient le montant, en privilégiant celle qui
    /// correspond aussi à la durée demandée.
    static func coefficient(ranges: [LeaserRange], amount: Double, duration: Int) -> Double {
        let matching = ranges.filter { amount >= $0.min && amount <= $0.max }

        if let exact = matching.first(where: { $0.durationMonths == duration }) {
            return exact.coefficient
        }
        if let any = matching.first {
            return any.coefficient
        }
        return ranges.first?.coefficient ?? fallbackCoefficient
    }

    /// Mensualité = montant financé × coefficient / 100.
    static func monthlyPayment(amount: Double, coefficient: Double) -> Double {
        ((amount * coefficient) / 100 * 100).rounded() / 100
    }

    /// Montant financé = prix d'achat majoré de la marge.
    static func financedAmount(purchasePrice: Double, marginPercent: Double) -> Double {
        ((purchasePrice * (1 + marginPercent / 100)) * 100).rounded() / 100
    }
}

/// Ligne d'équipement en cours de saisie.
struct DraftEquipment: Identifiable, Sendable {
    let id = UUID()
    var title: String
    var purchasePrice: Double
    var quantity: Int
    var margin: Double

    var financed: Double {
        Financing.financedAmount(purchasePrice: purchasePrice, marginPercent: margin) * Double(quantity)
    }
}


extension MonthlyFinancialData: Equatable {
    static func == (a: Self, b: Self) -> Bool { a.monthNumber == b.monthNumber }
}
