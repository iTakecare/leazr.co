import Foundation
import Observation
import SwiftUI
import Supabase

// MARK: - Modèle

/// Article de stock, repris de `stockService.ts`.
struct StockItem: Decodable, Identifiable, Sendable {
    let id: String
    let title: String
    let serialNumber: String?
    let status: String
    let condition: String?
    let source: String?
    let quantity: Int
    let purchasePrice: Double
    let unitPrice: Double
    let buybackPrice: Double?
    let location: String?
    let category: String?
    let brand: String?
    let model: String?
    let cpu: String?
    let memory: String?
    let storage: String?
    let grade: String?
    let notes: String?
    let warrantyEndDate: Date?
    let receptionDate: Date?
    let updatedAt: Date?
    let supplier: NamedRow?
    let contract: ContractRow?

    struct NamedRow: Decodable, Sendable { let name: String? }

    struct ContractRow: Decodable, Sendable {
        let contractNumber: String?
        let clientName: String?
        enum CodingKeys: String, CodingKey {
            case contractNumber = "contract_number"
            case clientName = "client_name"
        }
    }

    static let columns = """
        id, title, serial_number, status, condition, source, quantity, purchase_price, \
        unit_price, buyback_price, location, category, brand, model, cpu, memory, storage, \
        grade, notes, warranty_end_date, reception_date, updated_at, \
        supplier:suppliers(name), contract:contracts!current_contract_id(contract_number, client_name)
        """

    enum CodingKeys: String, CodingKey {
        case id, title, status, condition, source, quantity, location, category
        case brand, model, cpu, memory, storage, grade, notes, supplier, contract
        case serialNumber = "serial_number"
        case purchasePrice = "purchase_price"
        case unitPrice = "unit_price"
        case buybackPrice = "buyback_price"
        case warrantyEndDate = "warranty_end_date"
        case receptionDate = "reception_date"
        case updatedAt = "updated_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        title = try c.decodeIfPresent(String.self, forKey: .title) ?? "Article"
        serialNumber = try c.decodeIfPresent(String.self, forKey: .serialNumber)
        status = try c.decodeIfPresent(String.self, forKey: .status) ?? "in_stock"
        condition = try c.decodeIfPresent(String.self, forKey: .condition)
        source = try c.decodeIfPresent(String.self, forKey: .source)
        quantity = try c.decodeIfPresent(Int.self, forKey: .quantity) ?? 1
        purchasePrice = try c.decodeIfPresent(Double.self, forKey: .purchasePrice) ?? 0
        unitPrice = try c.decodeIfPresent(Double.self, forKey: .unitPrice) ?? 0
        buybackPrice = try c.decodeIfPresent(Double.self, forKey: .buybackPrice)
        location = try c.decodeIfPresent(String.self, forKey: .location)
        category = try c.decodeIfPresent(String.self, forKey: .category)
        brand = try c.decodeIfPresent(String.self, forKey: .brand)
        model = try c.decodeIfPresent(String.self, forKey: .model)
        cpu = try c.decodeIfPresent(String.self, forKey: .cpu)
        memory = try c.decodeIfPresent(String.self, forKey: .memory)
        storage = try c.decodeIfPresent(String.self, forKey: .storage)
        grade = try c.decodeIfPresent(String.self, forKey: .grade)
        notes = try c.decodeIfPresent(String.self, forKey: .notes)
        supplier = try c.decodeIfPresent(NamedRow.self, forKey: .supplier)
        contract = try c.decodeIfPresent(ContractRow.self, forKey: .contract)

        func date(_ key: CodingKeys) throws -> Date? {
            guard let raw = try c.decodeIfPresent(String.self, forKey: key) else { return nil }
            return Format.parseDate(raw)
        }
        warrantyEndDate = try date(.warrantyEndDate)
        receptionDate = try date(.receptionDate)
        updatedAt = try date(.updatedAt)
    }

    /// Caractéristiques techniques sur une ligne, comme sur la fiche web.
    var specifications: String? {
        let parts = [cpu, memory, storage].compactMap { $0 }.filter { !$0.isEmpty }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }
}

/// Statuts, états et provenances du stock, repris des tables de configuration
/// de `stockService.ts` pour que les deux applications nomment pareil.
enum StockVocabulary {

    static let statuses: [(code: String, label: String, tint: Color)] = [
        ("ordered", "Commandé", Theme.sky),
        ("in_stock", "En stock", Theme.emerald),
        ("reserved", "Réservé", Theme.amber),
        ("assigned", "Attribué", Theme.violet),
        ("in_repair", "En réparation", Theme.amber),
        ("sold", "Vendu", Theme.mutedForeground),
        ("scrapped", "Rebut", Theme.destructive),
    ]

    static func statusLabel(_ code: String) -> String {
        statuses.first { $0.code == code }?.label
            ?? code.replacingOccurrences(of: "_", with: " ").capitalized
    }

    static func statusTint(_ code: String) -> Color {
        statuses.first { $0.code == code }?.tint ?? Theme.mutedForeground
    }

    static func statusIcon(_ code: String) -> String {
        switch code {
        case "ordered":    return "shippingbox.fill"
        case "in_stock":   return "checkmark.circle.fill"
        case "reserved":   return "lock.fill"
        case "assigned":   return "person.fill.checkmark"
        case "in_repair":  return "wrench.and.screwdriver.fill"
        case "sold":       return "eurosign.circle.fill"
        case "scrapped":   return "trash.fill"
        default:           return "cube.box.fill"
        }
    }

    static func conditionLabel(_ code: String?) -> String {
        switch code {
        case "new":       return "Neuf"
        case "like_new":  return "Comme neuf"
        case "good":      return "Bon état"
        case "fair":      return "État moyen"
        case "defective": return "Défectueux"
        case let other?:  return other.capitalized
        case nil:         return "—"
        }
    }

    static func sourceLabel(_ code: String?) -> String {
        switch code {
        case "purchase":          return "Achat"
        case "contract_buyback":  return "Reprise contrat"
        case "contract_swap":     return "Swap contrat"
        case let other?:          return other.replacingOccurrences(of: "_", with: " ").capitalized
        case nil:                 return "—"
        }
    }
}

/// Mouvement de stock : c'est la traçabilité de l'appareil.
struct StockMovement: Decodable, Identifiable, Sendable {
    let id: String
    let movementType: String
    let fromStatus: String?
    let toStatus: String?
    let notes: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, notes
        case movementType = "movement_type"
        case fromStatus = "from_status"
        case toStatus = "to_status"
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        movementType = try c.decodeIfPresent(String.self, forKey: .movementType) ?? ""
        fromStatus = try c.decodeIfPresent(String.self, forKey: .fromStatus)
        toStatus = try c.decodeIfPresent(String.self, forKey: .toStatus)
        notes = try c.decodeIfPresent(String.self, forKey: .notes)
        if let raw = try c.decodeIfPresent(String.self, forKey: .createdAt) {
            createdAt = Format.parseDate(raw)
        } else { createdAt = nil }
    }

    var label: String {
        switch movementType {
        case "reception":          return "Réception"
        case "assign_contract":    return "Attribué à un contrat"
        case "unassign_contract":  return "Retiré d'un contrat"
        case "swap_out":           return "Sorti par échange"
        case "swap_in":            return "Entré par échange"
        case "repair_start":       return "Départ en réparation"
        case "repair_end":         return "Retour de réparation"
        case "scrap":              return "Mis au rebut"
        case "sell":               return "Vendu"
        case "rachat_client":      return "Racheté par le client"
        case "contract_buyback":   return "Repris en fin de contrat"
        case "reserve_offer":      return "Réservé pour une demande"
        case "release_offer":      return "Réservation libérée"
        default:                   return movementType.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    var icon: String {
        switch movementType {
        case "reception", "swap_in":                 return "arrow.down.circle.fill"
        case "assign_contract":                      return "person.fill.checkmark"
        case "unassign_contract", "release_offer":   return "arrow.uturn.backward"
        case "swap_out":                             return "arrow.up.circle.fill"
        case "repair_start", "repair_end":           return "wrench.and.screwdriver.fill"
        case "scrap":                                return "trash.fill"
        case "sell", "rachat_client":                return "eurosign.circle.fill"
        case "contract_buyback":                     return "arrow.triangle.2.circlepath"
        case "reserve_offer":                        return "lock.fill"
        default:                                     return "clock"
        }
    }

    var tint: Color {
        switch movementType {
        case "reception", "swap_in", "repair_end":   return Theme.emerald
        case "assign_contract":                      return Theme.violet
        case "reserve_offer":                        return Theme.amber
        case "scrap":                                return Theme.destructive
        case "sell", "rachat_client":                return Theme.teal
        default:                                     return Theme.sky
        }
    }
}
