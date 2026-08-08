import Foundation
import SwiftUI

// MARK: - Contrat

/// Contrat complet, avec tout ce que la fiche web affiche.
///
/// La liste n'en charge qu'une partie : les dates, le mandat SEPA, Tulip et les
/// dispositions particulières n'ont d'intérêt qu'une fois le dossier ouvert.
struct ContractDetail: Decodable, Identifiable, Sendable {
    let id: String
    let offerId: String?
    let clientName: String
    let clientId: String?
    let clientEmail: String?
    let monthlyPayment: Double
    let financedAmount: Double?
    let amount: Double?
    let contractDuration: Int?
    let status: String
    let leaserName: String
    let leaserId: String?
    let contractNumber: String?
    let equipmentDescription: String?

    // Suivi de livraison
    let trackingNumber: String?
    let deliveryCarrier: String?
    let deliveryStatus: String?
    let estimatedDelivery: Date?

    // Dates
    let dossierDate: Date?
    let invoiceDate: Date?
    let paymentDate: Date?
    let deliveryDate: Date?
    let contractStartDate: Date?
    let contractEndDate: Date?

    // Auto-leasing et dispositions
    let isSelfLeasing: Bool
    let specialProvisions: String?

    // Mandat SEPA Mollie
    let mollieCustomerId: String?
    let mollieMandateId: String?
    let mollieMandateStatus: String?
    let mollieSubscriptionId: String?

    // Frais
    let dossierFeeAmount: Double?
    let dossierFeeStatus: String?
    let insuranceFeeAmount: Double?
    let insuranceFeeActive: Bool?

    // Assurance Tulip
    let tulipContractId: String?
    let tulipStatus: String?
    let tulipSubscribedAt: Date?

    // Signature et état partenaire
    let signatureStatus: String?
    let grenkeState: String?

    let createdAt: Date?
    let updatedAt: Date?

    static let columns = """
        id, offer_id, client_name, client_id, client_email, monthly_payment, \
        financed_amount, amount, contract_duration, status, leaser_name, leaser_id, \
        contract_number, equipment_description, tracking_number, delivery_carrier, \
        delivery_status, estimated_delivery, dossier_date, invoice_date, payment_date, \
        delivery_date, contract_start_date, contract_end_date, is_self_leasing, \
        special_provisions, mollie_customer_id, mollie_mandate_id, mollie_mandate_status, \
        mollie_subscription_id, dossier_fee_amount, dossier_fee_status, \
        insurance_fee_amount, insurance_fee_active, tulip_contract_id, tulip_status, \
        tulip_subscribed_at, signature_status, grenke_state, created_at, updated_at
        """

    enum CodingKeys: String, CodingKey {
        case id, status, amount
        case offerId = "offer_id"
        case clientName = "client_name"
        case clientId = "client_id"
        case clientEmail = "client_email"
        case monthlyPayment = "monthly_payment"
        case financedAmount = "financed_amount"
        case contractDuration = "contract_duration"
        case leaserName = "leaser_name"
        case leaserId = "leaser_id"
        case contractNumber = "contract_number"
        case equipmentDescription = "equipment_description"
        case trackingNumber = "tracking_number"
        case deliveryCarrier = "delivery_carrier"
        case deliveryStatus = "delivery_status"
        case estimatedDelivery = "estimated_delivery"
        case dossierDate = "dossier_date"
        case invoiceDate = "invoice_date"
        case paymentDate = "payment_date"
        case deliveryDate = "delivery_date"
        case contractStartDate = "contract_start_date"
        case contractEndDate = "contract_end_date"
        case isSelfLeasing = "is_self_leasing"
        case specialProvisions = "special_provisions"
        case mollieCustomerId = "mollie_customer_id"
        case mollieMandateId = "mollie_mandate_id"
        case mollieMandateStatus = "mollie_mandate_status"
        case mollieSubscriptionId = "mollie_subscription_id"
        case dossierFeeAmount = "dossier_fee_amount"
        case dossierFeeStatus = "dossier_fee_status"
        case insuranceFeeAmount = "insurance_fee_amount"
        case insuranceFeeActive = "insurance_fee_active"
        case tulipContractId = "tulip_contract_id"
        case tulipStatus = "tulip_status"
        case tulipSubscribedAt = "tulip_subscribed_at"
        case signatureStatus = "signature_status"
        case grenkeState = "grenke_state"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        func date(_ key: CodingKeys) throws -> Date? {
            guard let raw = try c.decodeIfPresent(String.self, forKey: key) else { return nil }
            return Format.parseDate(raw)
        }

        id = try c.decode(String.self, forKey: .id)
        offerId = try c.decodeIfPresent(String.self, forKey: .offerId)
        clientName = try c.decodeIfPresent(String.self, forKey: .clientName) ?? "Client"
        clientId = try c.decodeIfPresent(String.self, forKey: .clientId)
        clientEmail = try c.decodeIfPresent(String.self, forKey: .clientEmail)
        monthlyPayment = try c.decodeIfPresent(Double.self, forKey: .monthlyPayment) ?? 0
        financedAmount = try c.decodeIfPresent(Double.self, forKey: .financedAmount)
        amount = try c.decodeIfPresent(Double.self, forKey: .amount)
        contractDuration = try c.decodeIfPresent(Int.self, forKey: .contractDuration)
        status = try c.decodeIfPresent(String.self, forKey: .status) ?? "contract_sent"
        leaserName = try c.decodeIfPresent(String.self, forKey: .leaserName) ?? "Bailleur"
        leaserId = try c.decodeIfPresent(String.self, forKey: .leaserId)
        contractNumber = try c.decodeIfPresent(String.self, forKey: .contractNumber)
        equipmentDescription = try c.decodeIfPresent(String.self, forKey: .equipmentDescription)
        trackingNumber = try c.decodeIfPresent(String.self, forKey: .trackingNumber)
        deliveryCarrier = try c.decodeIfPresent(String.self, forKey: .deliveryCarrier)
        deliveryStatus = try c.decodeIfPresent(String.self, forKey: .deliveryStatus)
        estimatedDelivery = try date(.estimatedDelivery)
        dossierDate = try date(.dossierDate)
        invoiceDate = try date(.invoiceDate)
        paymentDate = try date(.paymentDate)
        deliveryDate = try date(.deliveryDate)
        contractStartDate = try date(.contractStartDate)
        contractEndDate = try date(.contractEndDate)
        isSelfLeasing = try c.decodeIfPresent(Bool.self, forKey: .isSelfLeasing) ?? false
        specialProvisions = try c.decodeIfPresent(String.self, forKey: .specialProvisions)
        mollieCustomerId = try c.decodeIfPresent(String.self, forKey: .mollieCustomerId)
        mollieMandateId = try c.decodeIfPresent(String.self, forKey: .mollieMandateId)
        mollieMandateStatus = try c.decodeIfPresent(String.self, forKey: .mollieMandateStatus)
        mollieSubscriptionId = try c.decodeIfPresent(String.self, forKey: .mollieSubscriptionId)
        dossierFeeAmount = try c.decodeIfPresent(Double.self, forKey: .dossierFeeAmount)
        dossierFeeStatus = try c.decodeIfPresent(String.self, forKey: .dossierFeeStatus)
        insuranceFeeAmount = try c.decodeIfPresent(Double.self, forKey: .insuranceFeeAmount)
        insuranceFeeActive = try c.decodeIfPresent(Bool.self, forKey: .insuranceFeeActive)
        tulipContractId = try c.decodeIfPresent(String.self, forKey: .tulipContractId)
        tulipStatus = try c.decodeIfPresent(String.self, forKey: .tulipStatus)
        tulipSubscribedAt = try date(.tulipSubscribedAt)
        signatureStatus = try c.decodeIfPresent(String.self, forKey: .signatureStatus)
        grenkeState = try c.decodeIfPresent(String.self, forKey: .grenkeState)
        createdAt = try date(.createdAt)
        updatedAt = try date(.updatedAt)
    }

    var duration: Int { contractDuration ?? 36 }
    var hasMandate: Bool { mollieCustomerId != nil && mollieMandateId != nil }
    var isInsured: Bool { tulipContractId != nil }
}

// MARK: - Workflow contrat

/// Étapes du contrat, reprises de `ContractWorkflowPanel.tsx`.
enum ContractWorkflow {

    struct Step: Identifiable, Sendable {
        let id: String
        let label: String
        let icon: String
        let detail: String
    }

    static let steps: [Step] = [
        .init(id: "contract_sent", label: "Envoyé", icon: "paperplane.fill", detail: "Contrat envoyé au client"),
        .init(id: "contract_signed", label: "Signé", icon: "checkmark.circle.fill", detail: "Contrat signé par le client"),
        .init(id: "equipment_ordered", label: "Commandé", icon: "shippingbox.fill", detail: "Équipement commandé"),
        .init(id: "delivered", label: "Livré", icon: "truck.box.fill", detail: "Équipement livré"),
        .init(id: "active", label: "Actif", icon: "play.circle.fill", detail: "Contrat en cours"),
        .init(id: "extended", label: "Prolongé", icon: "arrow.clockwise", detail: "Contrat prolongé au-delà de la date de fin"),
        .init(id: "completed", label: "Terminé", icon: "flag.checkered", detail: "Contrat terminé"),
    ]

    /// États Grenke qui impliquent au minimum « Envoyé » — la signature est en
    /// cours chez le partenaire.
    private static let grenkeSentStates: Set<String> = [
        "ReadyToSign", "ContractPrinted", "ContractPrintedBeforeStatement", "StartingESignature",
        "AwaitingCustomerSignature", "AwaitingPartnerSignature", "AwaitingSigningAppSignature",
    ]

    /// États qui impliquent au minimum « Signé » : les deux parties ont signé.
    private static let grenkeSignedStates: Set<String> = [
        "AwaitingDeliveryConfirmation", "Contracted", "RunningContract", "ApplicationSettled",
        "Paid", "ProlongedContract",
    ]

    /// Étape courante, sans jamais reculer en deçà du statut réel. L'état
    /// Grenke et le statut de signature ne peuvent que faire avancer.
    static func currentIndex(for contract: ContractDetail) -> Int {
        var index = steps.firstIndex { $0.id == contract.status } ?? 0

        if contract.signatureStatus == "signed",
           let signed = steps.firstIndex(where: { $0.id == "contract_signed" }),
           signed > index {
            index = signed
        }

        if let state = contract.grenkeState {
            if grenkeSignedStates.contains(state),
               let signed = steps.firstIndex(where: { $0.id == "contract_signed" }),
               signed > index {
                index = signed
            } else if grenkeSentStates.contains(state),
                      let sent = steps.firstIndex(where: { $0.id == "contract_sent" }),
                      sent > index {
                index = sent
            }
        }

        return index
    }

    static func label(_ status: String) -> String {
        switch status {
        case "cancelled": return "Annulé"
        default: return steps.first { $0.id == status }?.label
            ?? status.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    static func tint(_ status: String) -> Color {
        switch status {
        case "contract_sent":     return Theme.sky
        case "contract_signed":   return Theme.violet
        case "equipment_ordered": return Theme.amber
        case "delivered":         return Theme.teal
        case "active":            return Theme.emerald
        case "extended":          return Theme.primary
        case "completed":         return Theme.mutedForeground
        case "cancelled":         return Theme.destructive
        default:                  return Theme.mutedForeground
        }
    }
}

// MARK: - Équipement de contrat

struct ContractEquipment: Decodable, Identifiable, Sendable {
    let id: String
    let title: String
    let quantity: Int
    let purchasePrice: Double
    let actualPurchasePrice: Double?
    let margin: Double
    let monthlyPayment: Double
    let serialNumber: String?
    let notSerializable: Bool
    let orderStatus: String?
    let supplierId: String?
    let supplierPrice: Double?
    let orderDate: Date?
    let orderReference: String?
    let receptionDate: Date?
    let orderNotes: String?
    let boughtBackAt: Date?
    let boughtBackPrice: Double?

    static let columns = """
        id, title, quantity, purchase_price, actual_purchase_price, margin, \
        monthly_payment, serial_number, not_serializable, order_status, supplier_id, \
        supplier_price, order_date, order_reference, reception_date, order_notes, \
        bought_back_at, bought_back_price
        """

    enum CodingKeys: String, CodingKey {
        case id, title, quantity, margin
        case purchasePrice = "purchase_price"
        case actualPurchasePrice = "actual_purchase_price"
        case monthlyPayment = "monthly_payment"
        case serialNumber = "serial_number"
        case notSerializable = "not_serializable"
        case orderStatus = "order_status"
        case supplierId = "supplier_id"
        case supplierPrice = "supplier_price"
        case orderDate = "order_date"
        case orderReference = "order_reference"
        case receptionDate = "reception_date"
        case orderNotes = "order_notes"
        case boughtBackAt = "bought_back_at"
        case boughtBackPrice = "bought_back_price"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        func date(_ key: CodingKeys) throws -> Date? {
            guard let raw = try c.decodeIfPresent(String.self, forKey: key) else { return nil }
            return Format.parseDate(raw)
        }

        id = try c.decode(String.self, forKey: .id)
        title = try c.decodeIfPresent(String.self, forKey: .title) ?? "Équipement"
        quantity = try c.decodeIfPresent(Int.self, forKey: .quantity) ?? 1
        purchasePrice = try c.decodeIfPresent(Double.self, forKey: .purchasePrice) ?? 0
        actualPurchasePrice = try c.decodeIfPresent(Double.self, forKey: .actualPurchasePrice)
        margin = try c.decodeIfPresent(Double.self, forKey: .margin) ?? 0
        monthlyPayment = try c.decodeIfPresent(Double.self, forKey: .monthlyPayment) ?? 0
        serialNumber = try c.decodeIfPresent(String.self, forKey: .serialNumber)
        notSerializable = try c.decodeIfPresent(Bool.self, forKey: .notSerializable) ?? false
        orderStatus = try c.decodeIfPresent(String.self, forKey: .orderStatus)
        supplierId = try c.decodeIfPresent(String.self, forKey: .supplierId)
        supplierPrice = try c.decodeIfPresent(Double.self, forKey: .supplierPrice)
        orderDate = try date(.orderDate)
        orderReference = try c.decodeIfPresent(String.self, forKey: .orderReference)
        receptionDate = try date(.receptionDate)
        orderNotes = try c.decodeIfPresent(String.self, forKey: .orderNotes)
        boughtBackAt = try date(.boughtBackAt)
        boughtBackPrice = try c.decodeIfPresent(Double.self, forKey: .boughtBackPrice)
    }

    /// Numéros de série saisis, un par unité. La base les stocke séparés par
    /// des virgules pour tenir la quantité sur une seule ligne.
    var serialNumbers: [String] {
        guard let serialNumber, !serialNumber.isEmpty else {
            return Array(repeating: "", count: quantity)
        }
        var parts = serialNumber
            .split(separator: ",", omittingEmptySubsequences: false)
            .map { $0.trimmingCharacters(in: .whitespaces) }
        while parts.count < quantity { parts.append("") }
        return Array(parts.prefix(quantity))
    }

    var isBoughtBack: Bool { boughtBackAt != nil }
}

/// Statuts de commande fournisseur, repris de `ORDER_STATUS_CONFIG`.
enum OrderStatusVocabulary {
    static let all: [(code: String, label: String, tint: Color)] = [
        ("to_order", "À commander", Theme.destructive),
        ("ordered", "Commandé", Theme.amber),
        ("received", "Reçu", Theme.emerald),
        ("cancelled", "Annulé", Theme.mutedForeground),
    ]

    static func label(_ code: String?) -> String {
        all.first { $0.code == (code ?? "to_order") }?.label ?? "À commander"
    }

    static func tint(_ code: String?) -> Color {
        all.first { $0.code == (code ?? "to_order") }?.tint ?? Theme.destructive
    }
}

// MARK: - Journal du contrat

struct ContractLog: Decodable, Identifiable, Sendable {
    let id: String
    let previousStatus: String?
    let newStatus: String?
    let reason: String?
    let userName: String?
    let createdAt: Date?

    static let columns = "id, previous_status, new_status, reason, user_name, created_at"

    enum CodingKeys: String, CodingKey {
        case id, reason
        case previousStatus = "previous_status"
        case newStatus = "new_status"
        case userName = "user_name"
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        previousStatus = try c.decodeIfPresent(String.self, forKey: .previousStatus)
        newStatus = try c.decodeIfPresent(String.self, forKey: .newStatus)
        reason = try c.decodeIfPresent(String.self, forKey: .reason)
        userName = try c.decodeIfPresent(String.self, forKey: .userName)
        if let raw = try c.decodeIfPresent(String.self, forKey: .createdAt) {
            createdAt = Format.parseDate(raw)
        } else { createdAt = nil }
    }
}

struct ContractDocument: Decodable, Identifiable, Sendable {
    let id: String
    let documentType: String
    let fileName: String
    let fileSize: Int?
    let status: String
    let uploadedAt: Date?

    static let columns = "id, document_type, file_name, file_size, status, uploaded_at"

    enum CodingKeys: String, CodingKey {
        case id, status
        case documentType = "document_type"
        case fileName = "file_name"
        case fileSize = "file_size"
        case uploadedAt = "uploaded_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        documentType = try c.decodeIfPresent(String.self, forKey: .documentType) ?? "other"
        fileName = try c.decodeIfPresent(String.self, forKey: .fileName) ?? "Document"
        fileSize = try c.decodeIfPresent(Int.self, forKey: .fileSize)
        status = try c.decodeIfPresent(String.self, forKey: .status) ?? "pending"
        if let raw = try c.decodeIfPresent(String.self, forKey: .uploadedAt) {
            uploadedAt = Format.parseDate(raw)
        } else { uploadedAt = nil }
    }

    var readableSize: String {
        guard let fileSize, fileSize > 0 else { return "" }
        return ByteCountFormatter.string(fromByteCount: Int64(fileSize), countStyle: .file)
    }
}

// MARK: - Règles de démarrage du bailleur

/// Règle de calcul de la date de début à partir de la livraison, reprise de
/// `ContractDatesManager.tsx`. Elle appartient au bailleur, pas au contrat.
enum ContractStartRule: String, CaseIterable, Identifiable {
    case nextMonthFirst = "next_month_first"
    case nextQuarterFirst = "next_quarter_first"
    case nextSemesterFirst = "next_semester_first"
    case nextYearFirst = "next_year_first"
    case deliveryDate = "delivery_date"
    case deliveryDatePlus15 = "delivery_date_plus_15"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .nextMonthFirst:     return "1er du mois suivant"
        case .nextQuarterFirst:   return "1er du trimestre suivant"
        case .nextSemesterFirst:  return "1er du semestre suivant"
        case .nextYearFirst:      return "1er de l'année suivante"
        case .deliveryDate:       return "Date de livraison exacte"
        case .deliveryDatePlus15: return "Date de livraison + 15 jours"
        }
    }

    func startDate(from delivery: Date, calendar: Calendar = .current) -> Date? {
        let components = calendar.dateComponents([.year, .month], from: delivery)
        guard let year = components.year, let month = components.month else { return nil }

        switch self {
        case .nextMonthFirst:
            return calendar.date(from: DateComponents(year: year, month: month + 1, day: 1))
        case .nextQuarterFirst:
            let quarter = (month - 1) / 3
            return calendar.date(from: DateComponents(year: year, month: (quarter + 1) * 3 + 1, day: 1))
        case .nextSemesterFirst:
            return month <= 6
                ? calendar.date(from: DateComponents(year: year, month: 7, day: 1))
                : calendar.date(from: DateComponents(year: year + 1, month: 1, day: 1))
        case .nextYearFirst:
            return calendar.date(from: DateComponents(year: year + 1, month: 1, day: 1))
        case .deliveryDate:
            return delivery
        case .deliveryDatePlus15:
            return calendar.date(byAdding: .day, value: 15, to: delivery)
        }
    }
}
