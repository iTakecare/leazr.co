import Foundation
import SwiftUI
import Supabase
import UIKit

/// Opérations du catalogue, portage de `catalogService.ts`, `packService.ts` et
/// `productDuplicationService.ts`.
@MainActor
enum CatalogService {

    // MARK: - Produits

    static func products(companyId: String, includeInactive: Bool = true) async -> [CatalogProduct] {
        var query = Backend.client
            .from("products")
            .select(CatalogProduct.listColumns)
            .eq("company_id", value: companyId)

        if !includeInactive {
            query = query.eq("active", value: true)
        }

        return (try? await query
            .order("name", ascending: true)
            .limit(1000)
            .execute().value) ?? []
    }

    static func product(id: String) async -> CatalogProduct? {
        let rows: [CatalogProduct] = (try? await Backend.client
            .from("products")
            .select(CatalogProduct.columns)
            .eq("id", value: id)
            .limit(1)
            .execute().value) ?? []
        return rows.first
    }

    /// Variantes déclarées d'un produit parent.
    static func variants(productId: String) async -> [ProductVariant] {
        (try? await Backend.client
            .from("product_variant_prices")
            .select(ProductVariant.columns)
            .eq("product_id", value: productId)
            .execute().value) ?? []
    }

    struct ProductInput {
        var name = ""
        var brandId: String?
        var categoryId: String?
        var description = ""
        var shortDescription = ""
        var price: Double = 0
        var monthlyPrice: Double?
        var model = ""
        var sku = ""
        var stock: Int?
        var isActive = true
        var adminOnly = false
        var specifications: [String: String] = [:]
    }

    /// La société vient toujours de l'utilisateur authentifié, jamais d'un
    /// paramètre : c'est la règle du web, elle empêche d'affecter un produit
    /// au mauvais tenant.
    static func createProduct(_ input: ProductInput) async -> String? {
        guard let companyId = await Session.shared.resolve() else { return nil }
        struct Row: Decodable { let id: String }

        do {
            let created: [Row] = try await Backend.client
                .from("products")
                .insert(payload(from: input, companyId: companyId))
                .select("id")
                .execute()
                .value
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return created.first?.id
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return nil
        }
    }

    static func updateProduct(id: String, _ input: ProductInput) async -> Bool {
        do {
            try await Backend.client
                .from("products")
                .update(payload(from: input, companyId: nil))
                .eq("id", value: id)
                .execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    private static func payload(from input: ProductInput, companyId: String?) -> [String: AnyJSON] {
        var payload: [String: AnyJSON] = [
            "name": .string(input.name.trimmingCharacters(in: .whitespaces)),
            "brand_id": input.brandId.map(AnyJSON.string) ?? .null,
            "category_id": input.categoryId.map(AnyJSON.string) ?? .null,
            "description": input.description.isEmpty ? .null : .string(input.description),
            "short_description": input.shortDescription.isEmpty ? .null : .string(input.shortDescription),
            "price": .double(input.price),
            "monthly_price": input.monthlyPrice.map { AnyJSON.double($0) } ?? .null,
            "model": input.model.isEmpty ? .null : .string(input.model),
            "sku": input.sku.isEmpty ? .null : .string(input.sku),
            "stock": input.stock.map { AnyJSON.integer($0) } ?? .null,
            "active": .bool(input.isActive),
            "admin_only": .bool(input.adminOnly),
            "specifications": .object(input.specifications.mapValues { AnyJSON.string($0) }),
        ]
        if let companyId { payload["company_id"] = .string(companyId) }
        return payload
    }

    /// Suppression : les tables sans cascade doivent être vidées d'abord,
    /// sinon la contrainte bloque. Ordre repris de `deleteProduct`.
    static func deleteProduct(id: String) async -> Bool {
        for table in ["equipment_requests", "equipment_alerts"] {
            _ = try? await Backend.client
                .from(table)
                .delete()
                .eq("equipment_id", value: id)
                .execute()
        }
        _ = try? await Backend.client
            .from("offer_equipment")
            .delete()
            .eq("product_id", value: id)
            .execute()
        _ = try? await Backend.client
            .from("products")
            .delete()
            .eq("parent_id", value: id)
            .execute()

        do {
            try await Backend.client
                .from("products")
                .delete()
                .eq("id", value: id)
                .execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    /// Duplique un produit avec ses variantes. Le nom reçoit un suffixe pour
    /// que les deux fiches restent distinguables dans une liste.
    static func duplicateProduct(_ product: CatalogProduct) async -> String? {
        guard let companyId = await Session.shared.resolve() else { return nil }
        struct Row: Decodable { let id: String }

        var payload: [String: AnyJSON] = [
            "company_id": .string(companyId),
            "name": .string("\(product.name) (copie)"),
            "brand_id": product.brandId.map(AnyJSON.string) ?? .null,
            "category_id": product.categoryId.map(AnyJSON.string) ?? .null,
            "description": product.description.map(AnyJSON.string) ?? .null,
            "short_description": product.shortDescription.map(AnyJSON.string) ?? .null,
            "price": .double(product.price),
            "monthly_price": product.monthlyPrice.map { AnyJSON.double($0) } ?? .null,
            "model": product.model.map(AnyJSON.string) ?? .null,
            "image_url": product.imageURL.map(AnyJSON.string) ?? .null,
            "active": .bool(product.isActive),
            "admin_only": .bool(product.adminOnly),
            "is_parent": .bool(product.isParent),
            "specifications": .object(product.specifications.mapValues { AnyJSON.string($0) }),
        ]
        if !product.variationAttributes.isEmpty {
            payload["variation_attributes"] = .object(
                product.variationAttributes.mapValues { values in
                    AnyJSON.array(values.map { .string($0) })
                }
            )
        }

        do {
            let created: [Row] = try await Backend.client
                .from("products")
                .insert(payload)
                .select("id")
                .execute()
                .value
            guard let newId = created.first?.id else { return nil }

            // Les combinaisons de prix suivent le produit : sans elles, la
            // copie d'un produit à variantes serait inutilisable.
            let variants = await variants(productId: product.id)
            if !variants.isEmpty {
                _ = try? await Backend.client
                    .from("product_variant_prices")
                    .insert(variants.map { variant in
                        [
                            "product_id": AnyJSON.string(newId),
                            "attributes": .object(variant.attributes.mapValues { AnyJSON.string($0) }),
                            "price": .double(variant.price),
                            "monthly_price": variant.monthlyPrice.map { AnyJSON.double($0) } ?? .null,
                        ]
                    })
                    .execute()
            }

            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return newId
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return nil
        }
    }

    // MARK: - Variantes

    static func saveVariant(
        productId: String,
        variantId: String?,
        attributes: [String: String],
        price: Double,
        monthlyPrice: Double?
    ) async -> Bool {
        let payload: [String: AnyJSON] = [
            "product_id": .string(productId),
            "attributes": .object(attributes.mapValues { AnyJSON.string($0) }),
            "price": .double(price),
            "monthly_price": monthlyPrice.map { AnyJSON.double($0) } ?? .null,
        ]

        do {
            if let variantId {
                try await Backend.client
                    .from("product_variant_prices")
                    .update(payload)
                    .eq("id", value: variantId)
                    .execute()
            } else {
                try await Backend.client
                    .from("product_variant_prices")
                    .insert(payload)
                    .execute()
            }
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    static func deleteVariant(id: String) async -> Bool {
        do {
            try await Backend.client
                .from("product_variant_prices")
                .delete()
                .eq("id", value: id)
                .execute()
            return true
        } catch {
            return false
        }
    }

    /// Enregistre les axes de variation du produit parent. Ce sont eux qui
    /// définissent les combinaisons possibles.
    static func setVariationAttributes(
        productId: String,
        attributes: [String: [String]]
    ) async -> Bool {
        do {
            try await Backend.client
                .from("products")
                .update([
                    "variation_attributes": AnyJSON.object(
                        attributes.mapValues { AnyJSON.array($0.map { .string($0) }) }
                    ),
                    "is_parent": .bool(!attributes.isEmpty),
                ])
                .eq("id", value: productId)
                .execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    // MARK: - Images

    /// Téléverse une image dans le bucket `product-images` et la rattache au
    /// produit. La principale alimente `image_url`, les autres `image_urls`.
    static func uploadImage(
        productId: String,
        data: Data,
        isMain: Bool,
        existing: CatalogProduct
    ) async -> Bool {
        let name = "\(productId)/\(UUID().uuidString).jpg"

        do {
            try await Backend.client.storage
                .from("product-images")
                .upload(name, data: data, options: FileOptions(contentType: "image/jpeg", upsert: true))

            let url = try Backend.client.storage
                .from("product-images")
                .getPublicURL(path: name)
                .absoluteString

            var payload: [String: AnyJSON] = [:]
            if isMain || existing.imageURL == nil {
                payload["image_url"] = .string(url)
            } else {
                payload["image_urls"] = .array((existing.imageURLs + [url]).map { .string($0) })
            }

            try await Backend.client
                .from("products")
                .update(payload)
                .eq("id", value: productId)
                .execute()

            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    /// Retire une image de la fiche. Si c'était la principale, la suivante
    /// prend sa place — une fiche sans visuel se vend mal.
    static func removeImage(product: CatalogProduct, url: String) async -> Bool {
        var remaining = product.allImages.filter { $0 != url }
        var payload: [String: AnyJSON] = [:]

        if product.imageURL == url {
            payload["image_url"] = remaining.first.map(AnyJSON.string) ?? .null
            if !remaining.isEmpty { remaining.removeFirst() }
        }
        payload["image_urls"] = .array(remaining.map { .string($0) })

        do {
            try await Backend.client
                .from("products")
                .update(payload)
                .eq("id", value: product.id)
                .execute()
            return true
        } catch {
            return false
        }
    }

    // MARK: - Marques et catégories

    static func brands(companyId: String) async -> [CatalogTerm] {
        (try? await Backend.client
            .from("brands")
            .select(CatalogTerm.columns)
            .eq("company_id", value: companyId)
            .order("name", ascending: true)
            .execute().value) ?? []
    }

    static func categories(companyId: String) async -> [CatalogTerm] {
        (try? await Backend.client
            .from("categories")
            .select(CatalogTerm.columns)
            .eq("company_id", value: companyId)
            .order("name", ascending: true)
            .execute().value) ?? []
    }

    static func saveTerm(
        table: String,
        id: String?,
        name: String,
        translation: String
    ) async -> Bool {
        guard let companyId = await Session.shared.resolve() else { return false }

        var payload: [String: AnyJSON] = [
            "name": .string(name.trimmingCharacters(in: .whitespaces)),
            "translation": .string(translation.trimmingCharacters(in: .whitespaces)),
        ]

        do {
            if let id {
                try await Backend.client.from(table).update(payload).eq("id", value: id).execute()
            } else {
                payload["company_id"] = .string(companyId)
                try await Backend.client.from(table).insert(payload).execute()
            }
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    static func deleteTerm(table: String, id: String) async -> Bool {
        do {
            try await Backend.client.from(table).delete().eq("id", value: id).execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    // MARK: - Packs

    static func packs(companyId: String) async -> [ProductPack] {
        (try? await Backend.client
            .from("product_packs")
            .select(ProductPack.columns)
            .eq("company_id", value: companyId)
            .order("name", ascending: true)
            .execute().value) ?? []
    }

    static func packItems(packId: String) async -> [ProductPackItem] {
        (try? await Backend.client
            .from("product_pack_items")
            .select(ProductPackItem.columns)
            .eq("pack_id", value: packId)
            .execute().value) ?? []
    }

    static func savePack(
        id: String?,
        name: String,
        description: String,
        isActive: Bool,
        isFeatured: Bool,
        adminOnly: Bool,
        monthlyPrice: Double?,
        promoPrice: Double?,
        promoActive: Bool
    ) async -> Bool {
        guard let companyId = await Session.shared.resolve() else { return false }

        var payload: [String: AnyJSON] = [
            "name": .string(name.trimmingCharacters(in: .whitespaces)),
            "description": description.isEmpty ? .null : .string(description),
            "is_active": .bool(isActive),
            "is_featured": .bool(isFeatured),
            "admin_only": .bool(adminOnly),
            "pack_monthly_price": monthlyPrice.map { AnyJSON.double($0) } ?? .null,
            "pack_promo_price": promoPrice.map { AnyJSON.double($0) } ?? .null,
            "promo_active": .bool(promoActive),
        ]

        do {
            if let id {
                try await Backend.client.from("product_packs").update(payload).eq("id", value: id).execute()
            } else {
                payload["company_id"] = .string(companyId)
                try await Backend.client.from("product_packs").insert(payload).execute()
            }
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    static func deletePack(id: String) async -> Bool {
        do {
            try await Backend.client.from("product_packs").delete().eq("id", value: id).execute()
            return true
        } catch {
            return false
        }
    }

    // MARK: - Génération IA

    private struct DescriptionResponse: Decodable {
        let success: Bool?
        let description: String?
        let specifications: [String: String]?
        let error: String?
    }

    /// Description et spécifications produites par `generate-product-description`.
    /// Le modèle et le gabarit restent serveur : l'app ne fait que demander.
    static func generateDescription(
        productName: String,
        brand: String,
        category: String,
        includeSpecifications: Bool
    ) async throws -> (description: String?, specifications: [String: String]) {
        let response: DescriptionResponse = try await Backend.client.functions.invoke(
            "generate-product-description",
            options: FunctionInvokeOptions(body: [
                "productName": AnyJSON.string(productName),
                "brand": .string(brand),
                "category": .string(category),
                "includeSpecifications": .bool(includeSpecifications),
                "variants": .array([]),
            ])
        )

        if let error = response.error {
            throw OfferActions.ActionError.message(error)
        }
        guard response.success == true else {
            throw OfferActions.ActionError.message("Génération impossible.")
        }
        return (response.description, response.specifications ?? [:])
    }

    // MARK: - Impact environnemental

    static func environmentalCategories(companyId: String) async -> [EnvironmentalCategory] {
        (try? await Backend.client
            .from("categories")
            .select(EnvironmentalCategory.columns)
            .eq("company_id", value: companyId)
            .order("name", ascending: true)
            .execute().value) ?? []
    }

    static func setCategoryCO2(categoryId: String, savings: Double?) async -> Bool {
        do {
            try await Backend.client
                .from("categories")
                .update(["co2_savings_kg": savings.map { AnyJSON.double($0) } ?? .null])
                .eq("id", value: categoryId)
                .execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    // MARK: - Export

    /// Export CSV du catalogue, lisible par Excel et Numbers.
    static func exportCSV(_ products: [CatalogProduct]) -> URL {
        let headers = [
            "Nom", "Marque", "Catégorie", "Modèle", "SKU",
            "Prix d'achat", "Mensualité", "Stock", "Actif", "Admin seulement",
        ]
        var rows = [headers.joined(separator: ";")]

        for product in products {
            let fields = [
                product.name,
                product.brandName ?? "",
                product.categoryName ?? "",
                product.model ?? "",
                product.sku ?? "",
                number(product.price),
                product.monthlyPrice.map(number) ?? "",
                product.stock.map(String.init) ?? "",
                product.isActive ? "Oui" : "Non",
                product.adminOnly ? "Oui" : "Non",
            ]
            rows.append(fields.map(escape).joined(separator: ";"))
        }

        // BOM UTF-8 : sans lui, Excel sur Windows massacre les accents.
        let content = "\u{FEFF}" + rows.joined(separator: "\r\n")
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("Catalogue.csv")
        try? content.write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    private static func escape(_ value: String) -> String {
        guard value.contains(";") || value.contains("\"") || value.contains("\n") else {
            return value
        }
        return "\"\(value.replacingOccurrences(of: "\"", with: "\"\""))\""
    }

    private static func number(_ value: Double) -> String {
        String(format: "%.2f", value).replacingOccurrences(of: ".", with: ",")
    }
}
