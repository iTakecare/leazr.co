import Foundation
import SwiftUI

// MARK: - Produit

/// Produit du catalogue, dans sa forme complète.
///
/// `variation_attributes` et `specifications` sont des JSON libres : le web y
/// range respectivement les axes de variation (Couleur → [Noir, Argent]) et les
/// caractéristiques techniques. On les décode de façon tolérante.
struct CatalogProduct: Decodable, Identifiable, Sendable {
    let id: String
    let name: String
    let brandName: String?
    let categoryName: String?
    let brandId: String?
    let categoryId: String?
    let description: String?
    let shortDescription: String?
    let price: Double
    let monthlyPrice: Double?
    let imageURL: String?
    let imageURLs: [String]
    let model: String?
    let sku: String?
    let stock: Int?
    let isActive: Bool
    let adminOnly: Bool
    let isParent: Bool
    let parentId: String?
    let specifications: [String: String]
    let variationAttributes: [String: [String]]
    let createdAt: Date?

    static let columns = """
        id, name, brand_name, category_name, brand_id, category_id, description, \
        short_description, price, monthly_price, image_url, image_urls, model, sku, \
        stock, active, admin_only, is_parent, parent_id, specifications, \
        variation_attributes, created_at
        """

    /// Colonnes minimales pour une liste : sans les JSON lourds.
    static let listColumns = """
        id, name, brand_name, category_name, price, monthly_price, image_url, \
        active, admin_only, is_parent, parent_id, stock, created_at
        """

    enum CodingKeys: String, CodingKey {
        case id, name, description, price, model, sku, stock, specifications
        case brandName = "brand_name"
        case categoryName = "category_name"
        case brandId = "brand_id"
        case categoryId = "category_id"
        case shortDescription = "short_description"
        case monthlyPrice = "monthly_price"
        case imageURL = "image_url"
        case imageURLs = "image_urls"
        case isActive = "active"
        case adminOnly = "admin_only"
        case isParent = "is_parent"
        case parentId = "parent_id"
        case variationAttributes = "variation_attributes"
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? "Produit"
        brandName = try c.decodeIfPresent(String.self, forKey: .brandName)
        categoryName = try c.decodeIfPresent(String.self, forKey: .categoryName)
        brandId = try c.decodeIfPresent(String.self, forKey: .brandId)
        categoryId = try c.decodeIfPresent(String.self, forKey: .categoryId)
        description = try c.decodeIfPresent(String.self, forKey: .description)
        shortDescription = try c.decodeIfPresent(String.self, forKey: .shortDescription)
        price = try c.decodeIfPresent(Double.self, forKey: .price) ?? 0
        monthlyPrice = try c.decodeIfPresent(Double.self, forKey: .monthlyPrice)
        imageURL = try c.decodeIfPresent(String.self, forKey: .imageURL)
        imageURLs = (try? c.decodeIfPresent([String].self, forKey: .imageURLs)) as? [String] ?? []
        model = try c.decodeIfPresent(String.self, forKey: .model)
        sku = try c.decodeIfPresent(String.self, forKey: .sku)
        stock = try c.decodeIfPresent(Int.self, forKey: .stock)
        isActive = try c.decodeIfPresent(Bool.self, forKey: .isActive) ?? true
        adminOnly = try c.decodeIfPresent(Bool.self, forKey: .adminOnly) ?? false
        isParent = try c.decodeIfPresent(Bool.self, forKey: .isParent) ?? false
        parentId = try c.decodeIfPresent(String.self, forKey: .parentId)

        // Les spécifications mêlent chaînes et nombres selon les fiches.
        specifications = (try? c.decode([String: AnyCodableValue].self, forKey: .specifications))
            .map { $0.mapValues(\.description) } ?? [:]

        variationAttributes =
            (try? c.decodeIfPresent([String: [String]].self, forKey: .variationAttributes))
                as? [String: [String]] ?? [:]

        if let raw = try c.decodeIfPresent(String.self, forKey: .createdAt) {
            createdAt = Format.parseDate(raw)
        } else { createdAt = nil }
    }

    /// Toutes les images connues, la principale en tête et sans doublon.
    var allImages: [String] {
        var seen = Set<String>()
        var result: [String] = []
        for url in ([imageURL].compactMap { $0 } + imageURLs) where !url.isEmpty {
            if seen.insert(url).inserted { result.append(url) }
        }
        return result
    }

    var hasVariants: Bool { isParent && !variationAttributes.isEmpty }
}

// MARK: - Variante

/// Combinaison de prix pour un jeu d'attributs (`product_variant_prices`).
struct ProductVariant: Decodable, Identifiable, Sendable {
    let id: String
    let productId: String
    let attributes: [String: String]
    let price: Double
    let monthlyPrice: Double?
    let stock: Int?

    static let columns = "id, product_id, attributes, price, monthly_price, stock"

    enum CodingKeys: String, CodingKey {
        case id, attributes, price, stock
        case productId = "product_id"
        case monthlyPrice = "monthly_price"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        productId = try c.decodeIfPresent(String.self, forKey: .productId) ?? ""
        price = try c.decodeIfPresent(Double.self, forKey: .price) ?? 0
        monthlyPrice = try c.decodeIfPresent(Double.self, forKey: .monthlyPrice)
        stock = try c.decodeIfPresent(Int.self, forKey: .stock)

        attributes = (try? c.decode([String: AnyCodableValue].self, forKey: .attributes))
            .map { $0.mapValues(\.description) } ?? [:]
    }

    /// Libellé lisible d'une combinaison : « Couleur : Noir · Taille : 15" ».
    var label: String {
        attributes
            .sorted { $0.key < $1.key }
            .map { "\($0.key) : \($0.value)" }
            .joined(separator: " · ")
    }
}

// MARK: - Marques et catégories

struct CatalogTerm: Decodable, Identifiable, Sendable {
    let id: String
    let name: String
    let translation: String?

    static let columns = "id, name, translation"

    /// Libellé affiché : la traduction si elle existe, le nom sinon.
    var label: String {
        let value = translation?.trimmingCharacters(in: .whitespaces) ?? ""
        return value.isEmpty ? name : value
    }
}

// MARK: - Pack

struct ProductPack: Decodable, Identifiable, Sendable {
    let id: String
    let name: String
    let description: String?
    let imageURL: String?
    let isActive: Bool
    let isFeatured: Bool
    let adminOnly: Bool
    let totalPurchasePrice: Double
    let totalMonthlyPrice: Double
    let totalMargin: Double
    let packMonthlyPrice: Double?
    let packPromoPrice: Double?
    let promoActive: Bool
    let selectedDuration: Int?

    static let columns = """
        id, name, description, image_url, is_active, is_featured, admin_only, \
        total_purchase_price, total_monthly_price, total_margin, pack_monthly_price, \
        pack_promo_price, promo_active, selected_duration
        """

    enum CodingKeys: String, CodingKey {
        case id, name, description
        case imageURL = "image_url"
        case isActive = "is_active"
        case isFeatured = "is_featured"
        case adminOnly = "admin_only"
        case totalPurchasePrice = "total_purchase_price"
        case totalMonthlyPrice = "total_monthly_price"
        case totalMargin = "total_margin"
        case packMonthlyPrice = "pack_monthly_price"
        case packPromoPrice = "pack_promo_price"
        case promoActive = "promo_active"
        case selectedDuration = "selected_duration"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? "Pack"
        description = try c.decodeIfPresent(String.self, forKey: .description)
        imageURL = try c.decodeIfPresent(String.self, forKey: .imageURL)
        isActive = try c.decodeIfPresent(Bool.self, forKey: .isActive) ?? true
        isFeatured = try c.decodeIfPresent(Bool.self, forKey: .isFeatured) ?? false
        adminOnly = try c.decodeIfPresent(Bool.self, forKey: .adminOnly) ?? false
        totalPurchasePrice = try c.decodeIfPresent(Double.self, forKey: .totalPurchasePrice) ?? 0
        totalMonthlyPrice = try c.decodeIfPresent(Double.self, forKey: .totalMonthlyPrice) ?? 0
        totalMargin = try c.decodeIfPresent(Double.self, forKey: .totalMargin) ?? 0
        packMonthlyPrice = try c.decodeIfPresent(Double.self, forKey: .packMonthlyPrice)
        packPromoPrice = try c.decodeIfPresent(Double.self, forKey: .packPromoPrice)
        promoActive = try c.decodeIfPresent(Bool.self, forKey: .promoActive) ?? false
        selectedDuration = try c.decodeIfPresent(Int.self, forKey: .selectedDuration)
    }

    /// Prix effectivement présenté : la promo si elle est active, sinon le prix
    /// du pack, sinon la somme des lignes.
    var effectiveMonthlyPrice: Double {
        if promoActive, let promo = packPromoPrice, promo > 0 { return promo }
        if let price = packMonthlyPrice, price > 0 { return price }
        return totalMonthlyPrice
    }
}

struct ProductPackItem: Decodable, Identifiable, Sendable {
    let id: String
    let productId: String
    let quantity: Int
    let unitPurchasePrice: Double
    let unitMonthlyPrice: Double
    let marginPercentage: Double
    let product: Named?

    struct Named: Decodable, Sendable {
        let name: String?
        let imageURL: String?
        enum CodingKeys: String, CodingKey {
            case name
            case imageURL = "image_url"
        }
    }

    static let columns = """
        id, product_id, quantity, unit_purchase_price, unit_monthly_price, \
        margin_percentage, product:products(name, image_url)
        """

    enum CodingKeys: String, CodingKey {
        case id, quantity, product
        case productId = "product_id"
        case unitPurchasePrice = "unit_purchase_price"
        case unitMonthlyPrice = "unit_monthly_price"
        case marginPercentage = "margin_percentage"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        productId = try c.decodeIfPresent(String.self, forKey: .productId) ?? ""
        quantity = try c.decodeIfPresent(Int.self, forKey: .quantity) ?? 1
        unitPurchasePrice = try c.decodeIfPresent(Double.self, forKey: .unitPurchasePrice) ?? 0
        unitMonthlyPrice = try c.decodeIfPresent(Double.self, forKey: .unitMonthlyPrice) ?? 0
        marginPercentage = try c.decodeIfPresent(Double.self, forKey: .marginPercentage) ?? 0
        product = try c.decodeIfPresent(Named.self, forKey: .product)
    }
}

// MARK: - Impact environnemental

/// Données CO₂ d'une catégorie, servies par `getCategoriesWithEnvironmentalData`.
struct EnvironmentalCategory: Decodable, Identifiable, Sendable {
    let id: String
    let name: String
    let translation: String?
    let co2SavingsKg: Double?

    static let columns = "id, name, translation, co2_savings_kg"

    enum CodingKeys: String, CodingKey {
        case id, name, translation
        case co2SavingsKg = "co2_savings_kg"
    }

    var label: String {
        let value = translation?.trimmingCharacters(in: .whitespaces) ?? ""
        return value.isEmpty ? name : value
    }
}
