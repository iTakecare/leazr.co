import Foundation
import SwiftUI

// MARK: - Facture

/// Facture complète, avec ce que la fiche web affiche.
///
/// `billing_data` est un JSON libre qui porte le client, l'équipement et
/// l'offre d'origine : c'est là que vit le détail, pas dans des colonnes.
struct InvoiceDetail: Decodable, Identifiable, Sendable {
    let id: String
    let contractId: String?
    let offerId: String?
    let invoiceNumber: String?
    let externalInvoiceId: String?
    let leaserName: String
    let invoiceType: String?
    let amount: Double
    let creditedAmount: Double
    let creditNoteId: String?
    let status: String
    let integrationType: String?
    let pdfURL: String?
    let generatedAt: Date?
    let sentAt: Date?
    let paidAt: Date?
    let dueDate: Date?
    let invoiceDate: Date?
    let createdAt: Date?
    let billing: BillingData?

    static let columns = """
        id, contract_id, offer_id, invoice_number, external_invoice_id, leaser_name, \
        invoice_type, amount, credited_amount, credit_note_id, status, integration_type, \
        pdf_url, generated_at, sent_at, paid_at, due_date, invoice_date, created_at, billing_data
        """

    enum CodingKeys: String, CodingKey {
        case id, amount, status
        case contractId = "contract_id"
        case offerId = "offer_id"
        case invoiceNumber = "invoice_number"
        case externalInvoiceId = "external_invoice_id"
        case leaserName = "leaser_name"
        case invoiceType = "invoice_type"
        case creditedAmount = "credited_amount"
        case creditNoteId = "credit_note_id"
        case integrationType = "integration_type"
        case pdfURL = "pdf_url"
        case generatedAt = "generated_at"
        case sentAt = "sent_at"
        case paidAt = "paid_at"
        case dueDate = "due_date"
        case invoiceDate = "invoice_date"
        case createdAt = "created_at"
        case billing = "billing_data"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        func date(_ key: CodingKeys) throws -> Date? {
            guard let raw = try c.decodeIfPresent(String.self, forKey: key) else { return nil }
            return Format.parseDate(raw)
        }

        id = try c.decode(String.self, forKey: .id)
        contractId = try c.decodeIfPresent(String.self, forKey: .contractId)
        offerId = try c.decodeIfPresent(String.self, forKey: .offerId)
        invoiceNumber = try c.decodeIfPresent(String.self, forKey: .invoiceNumber)
        externalInvoiceId = try c.decodeIfPresent(String.self, forKey: .externalInvoiceId)
        leaserName = try c.decodeIfPresent(String.self, forKey: .leaserName) ?? "—"
        invoiceType = try c.decodeIfPresent(String.self, forKey: .invoiceType)
        amount = try c.decodeIfPresent(Double.self, forKey: .amount) ?? 0
        creditedAmount = try c.decodeIfPresent(Double.self, forKey: .creditedAmount) ?? 0
        creditNoteId = try c.decodeIfPresent(String.self, forKey: .creditNoteId)
        status = try c.decodeIfPresent(String.self, forKey: .status) ?? "draft"
        integrationType = try c.decodeIfPresent(String.self, forKey: .integrationType)
        pdfURL = try c.decodeIfPresent(String.self, forKey: .pdfURL)
        generatedAt = try date(.generatedAt)
        sentAt = try date(.sentAt)
        paidAt = try date(.paidAt)
        dueDate = try date(.dueDate)
        invoiceDate = try date(.invoiceDate)
        createdAt = try date(.createdAt)
        billing = try c.decodeIfPresent(BillingData.self, forKey: .billing)
    }

    /// Contenu de `billing_data`, décodé au mieux : le JSON varie selon
    /// l'origine de la facture (leasing, achat, import Billit).
    struct BillingData: Decodable, Sendable {
        let client: Party?
        let leaser: Party?
        let offer: OfferRef?
        let equipment: [Line]?
        let description: String?

        enum CodingKeys: String, CodingKey {
            case client = "client_data"
            case leaser = "leaser_data"
            case offer = "offer_data"
            case equipment = "equipment_data"
            case description
        }

        struct Party: Decodable, Sendable {
            let name: String?
            let company: String?
            let email: String?
            let vatNumber: String?
            let address: String?
            let city: String?
            let postalCode: String?

            enum CodingKeys: String, CodingKey {
                case name, company, email, address, city
                case vatNumber = "vat_number"
                case postalCode = "postal_code"
            }

            var fullAddress: String? {
                let parts = [address, [postalCode, city].compactMap { $0 }.joined(separator: " ")]
                    .compactMap { $0 }
                    .filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
                return parts.isEmpty ? nil : parts.joined(separator: ", ")
            }
        }

        struct OfferRef: Decodable, Sendable {
            let id: String?
            let dossierNumber: String?
            let isPurchase: Bool?

            enum CodingKeys: String, CodingKey {
                case id
                case dossierNumber = "dossier_number"
                case isPurchase = "is_purchase"
            }
        }

        struct Line: Decodable, Identifiable, Sendable {
            let title: String?
            let quantity: Int?
            let purchasePrice: Double?
            let sellingPrice: Double?
            let serialNumber: String?

            var id: String { (title ?? "") + (serialNumber ?? "") }

            enum CodingKeys: String, CodingKey {
                case title, quantity
                case purchasePrice = "purchase_price"
                case sellingPrice = "selling_price"
                case serialNumber = "serial_number"
            }
        }
    }

    var isPurchase: Bool {
        invoiceType == "purchase" || billing?.offer?.isPurchase == true
    }

    /// Montant net : ce qui reste dû après note de crédit.
    var netAmount: Double { max(0, amount - creditedAmount) }

    var clientName: String {
        billing?.client?.company ?? billing?.client?.name ?? leaserName
    }

    /// Une facture est en retard si elle n'est ni payée ni créditée et que son
    /// échéance est passée — c'est ce qui déclenche la relance.
    var isOverdue: Bool {
        guard let dueDate, status != "paid", status != "credited", status != "cancelled" else {
            return false
        }
        return dueDate < Date()
    }
}

// MARK: - Vocabulaire

enum InvoiceVocabulary {

    static let statuses: [(code: String, label: String, tint: Color)] = [
        ("draft", "Brouillon", Theme.mutedForeground),
        ("sent", "Envoyée", Theme.sky),
        ("paid", "Payée", Theme.emerald),
        ("partial_credit", "Crédit partiel", Theme.amber),
        ("credited", "Créditée", Theme.violet),
        ("cancelled", "Annulée", Theme.destructive),
    ]

    static func label(_ code: String) -> String {
        statuses.first { $0.code == code }?.label
            ?? code.replacingOccurrences(of: "_", with: " ").capitalized
    }

    static func tint(_ code: String) -> Color {
        statuses.first { $0.code == code }?.tint ?? Theme.mutedForeground
    }

    static func icon(_ code: String) -> String {
        switch code {
        case "draft":          return "pencil"
        case "sent":           return "paperplane.fill"
        case "paid":           return "checkmark.circle.fill"
        case "partial_credit": return "minus.circle.fill"
        case "credited":       return "arrow.uturn.backward.circle.fill"
        case "cancelled":      return "xmark.circle.fill"
        default:               return "doc.text"
        }
    }

    static func typeLabel(_ code: String?) -> String {
        switch code {
        case "purchase": return "Vente directe"
        case "leasing":  return "Leasing"
        case let other?: return other.capitalized
        case nil:        return "Leasing"
        }
    }
}

/// Onglets de la liste, repris de `InvoicingPage.tsx`.
enum InvoiceTab: String, CaseIterable, Identifiable {
    case all
    case draft
    case sent
    case paid
    case credited
    case directSales

    var id: String { rawValue }

    var title: String {
        switch self {
        case .all:         return "Toutes"
        case .draft:       return "Brouillons"
        case .sent:        return "Envoyées"
        case .paid:        return "Payées"
        case .credited:    return "Créditées"
        case .directSales: return "Ventes directes"
        }
    }

    var tint: Color {
        switch self {
        case .all:         return Theme.primary
        case .draft:       return Theme.mutedForeground
        case .sent:        return Theme.sky
        case .paid:        return Theme.emerald
        case .credited:    return Theme.violet
        case .directSales: return Theme.teal
        }
    }

    func matches(_ invoice: InvoiceDetail) -> Bool {
        switch self {
        case .all:         return true
        case .draft:       return invoice.status == "draft"
        case .sent:        return invoice.status == "sent"
        case .paid:        return invoice.status == "paid"
        case .credited:    return invoice.status == "credited" || invoice.creditedAmount > 0
        case .directSales: return invoice.isPurchase
        }
    }
}

/// Tri de la liste, repris de `InvoiceSortFilter`.
enum InvoiceSort: String, CaseIterable, Identifiable {
    case dateDescending
    case dateAscending
    case amountDescending
    case amountAscending

    var id: String { rawValue }

    var title: String {
        switch self {
        case .dateDescending:   return "Plus récentes"
        case .dateAscending:    return "Plus anciennes"
        case .amountDescending: return "Montant décroissant"
        case .amountAscending:  return "Montant croissant"
        }
    }

    func sort(_ invoices: [InvoiceDetail]) -> [InvoiceDetail] {
        switch self {
        case .dateDescending:
            return invoices.sorted { ($0.invoiceDate ?? $0.createdAt ?? .distantPast) > ($1.invoiceDate ?? $1.createdAt ?? .distantPast) }
        case .dateAscending:
            return invoices.sorted { ($0.invoiceDate ?? $0.createdAt ?? .distantFuture) < ($1.invoiceDate ?? $1.createdAt ?? .distantFuture) }
        case .amountDescending:
            return invoices.sorted { $0.amount > $1.amount }
        case .amountAscending:
            return invoices.sorted { $0.amount < $1.amount }
        }
    }
}

// MARK: - Note de crédit

struct CreditNote: Decodable, Identifiable, Sendable {
    let id: String
    let invoiceId: String
    let creditNoteNumber: String?
    let amount: Double
    let reason: String?
    let status: String
    let issuedAt: Date?
    let invoice: InvoiceRef?

    struct InvoiceRef: Decodable, Sendable {
        let invoiceNumber: String?
        let leaserName: String?
        let amount: Double?

        enum CodingKeys: String, CodingKey {
            case invoiceNumber = "invoice_number"
            case leaserName = "leaser_name"
            case amount
        }
    }

    static let columns = """
        id, invoice_id, credit_note_number, amount, reason, status, issued_at, \
        invoice:invoices!credit_notes_invoice_id_fkey(invoice_number, leaser_name, amount)
        """

    enum CodingKeys: String, CodingKey {
        case id, amount, reason, status, invoice
        case invoiceId = "invoice_id"
        case creditNoteNumber = "credit_note_number"
        case issuedAt = "issued_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        invoiceId = try c.decodeIfPresent(String.self, forKey: .invoiceId) ?? ""
        creditNoteNumber = try c.decodeIfPresent(String.self, forKey: .creditNoteNumber)
        amount = try c.decodeIfPresent(Double.self, forKey: .amount) ?? 0
        reason = try c.decodeIfPresent(String.self, forKey: .reason)
        status = try c.decodeIfPresent(String.self, forKey: .status) ?? "applied"
        invoice = try c.decodeIfPresent(InvoiceRef.self, forKey: .invoice)
        if let raw = try c.decodeIfPresent(String.self, forKey: .issuedAt) {
            issuedAt = Format.parseDate(raw)
        } else { issuedAt = nil }
    }
}

// MARK: - Rapport comptable

/// Agrégat par année fiscale, calculé comme `getAccountingReport`.
struct FiscalYearReport: Identifiable, Sendable {
    let year: Int
    var invoiceTotal: Double = 0
    var invoiceCount: Int = 0
    var paid: Double = 0
    var paidCount: Int = 0
    var unpaid: Double = 0
    var unpaidCount: Int = 0
    var credited: Double = 0
    var creditedCount: Int = 0
    var creditNoteTotal: Double = 0
    var creditNoteCount: Int = 0

    var id: Int { year }

    /// Chiffre net de l'année : les notes de crédit sont imputées à leur année
    /// d'émission, pas à celle de la facture d'origine.
    var netRevenue: Double { invoiceTotal - creditNoteTotal }
}
