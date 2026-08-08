import Foundation
import SwiftUI
import Supabase

/// Lecture et écriture des réglages de la société et du compte.
///
/// Beaucoup d'écrans du web sont des éditeurs à la souris — gabarits HTML,
/// mappings d'intégration, grilles de coefficients. Ici on privilégie la
/// consultation fiable, et on n'ouvre l'édition que là où elle a du sens au
/// doigt.
@MainActor
enum SettingsService {

    // MARK: - Profil

    struct Profile: Decodable, Sendable {
        let id: String
        let firstName: String?
        let lastName: String?
        let email: String?
        let phone: String?
        let role: String
        let avatarURL: String?
        let companyId: String?

        static let columns = "id, first_name, last_name, email, phone, role, avatar_url, company_id"

        enum CodingKeys: String, CodingKey {
            case id, email, phone, role
            case firstName = "first_name"
            case lastName = "last_name"
            case avatarURL = "avatar_url"
            case companyId = "company_id"
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            id = try c.decode(String.self, forKey: .id)
            firstName = try c.decodeIfPresent(String.self, forKey: .firstName)
            lastName = try c.decodeIfPresent(String.self, forKey: .lastName)
            email = try c.decodeIfPresent(String.self, forKey: .email)
            phone = try c.decodeIfPresent(String.self, forKey: .phone)
            role = try c.decodeIfPresent(String.self, forKey: .role) ?? "user"
            avatarURL = try c.decodeIfPresent(String.self, forKey: .avatarURL)
            companyId = try c.decodeIfPresent(String.self, forKey: .companyId)
        }

        var fullName: String {
            let name = [firstName, lastName].compactMap { $0 }.joined(separator: " ")
                .trimmingCharacters(in: .whitespaces)
            return name.isEmpty ? (email ?? "Utilisateur") : name
        }

        var initials: String {
            let parts = fullName.split(separator: " ").prefix(2)
            let letters = parts.compactMap { $0.first.map(String.init) }.joined()
            return letters.isEmpty ? "?" : letters.uppercased()
        }
    }

    static func currentProfile() async -> Profile? {
        guard let userId = Session.shared.userId else { return nil }
        let rows: [Profile] = (try? await Backend.client
            .from("profiles")
            .select(Profile.columns)
            .eq("id", value: userId)
            .limit(1)
            .execute().value) ?? []
        return rows.first
    }

    static func updateProfile(
        firstName: String,
        lastName: String,
        phone: String
    ) async -> Bool {
        guard let userId = Session.shared.userId else { return false }

        func text(_ value: String) -> AnyJSON {
            let trimmed = value.trimmingCharacters(in: .whitespaces)
            return trimmed.isEmpty ? .null : .string(trimmed)
        }

        do {
            try await Backend.client
                .from("profiles")
                .update([
                    "first_name": text(firstName),
                    "last_name": text(lastName),
                    "phone": text(phone),
                ])
                .eq("id", value: userId)
                .execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    /// Envoie le lien de réinitialisation à l'adresse du compte.
    ///
    /// On ne saisit jamais de mot de passe dans l'application : le changement
    /// passe par le lien reçu par courriel, seul chemin qui ne fait transiter
    /// aucun secret par l'écran.
    static func requestPasswordReset(email: String) async -> Bool {
        do {
            try await Backend.client.auth.resetPasswordForEmail(email)
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    // MARK: - Utilisateurs

    static func teamMembers(companyId: String) async -> [Profile] {
        (try? await Backend.client
            .from("profiles")
            .select(Profile.columns)
            .eq("company_id", value: companyId)
            .order("last_name", ascending: true)
            .execute().value) ?? []
    }

    static func roleLabel(_ role: String) -> String {
        switch role {
        case "super_admin": return "Super administrateur"
        case "admin":       return "Administrateur"
        case "ambassador":  return "Ambassadeur"
        case "partner":     return "Partenaire"
        case "client":      return "Client"
        default:            return role.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    static func roleTint(_ role: String) -> Color {
        switch role {
        case "super_admin": return Theme.destructive
        case "admin":       return Theme.primary
        case "ambassador":  return Theme.violet
        case "partner":     return Theme.teal
        default:            return Theme.mutedForeground
        }
    }

    // MARK: - Bailleurs

    struct Leaser: Decodable, Identifiable, Sendable {
        let id: String
        let name: String
        let companyName: String?
        let email: String?
        let phone: String?
        let vatNumber: String?
        let logoURL: String?
        let isOwnCompany: Bool
        let residualValue: Double
        let availableDurations: [Int]
        let useDurationCoefficients: Bool
        let contractStartRule: String?
        let billingFrequency: String?

        static let columns = """
            id, name, company_name, email, phone, vat_number, logo_url, is_own_company, \
            residual_value_percentage, available_durations, use_duration_coefficients, \
            contract_start_rule, billing_frequency
            """

        enum CodingKeys: String, CodingKey {
            case id, name, email, phone
            case companyName = "company_name"
            case vatNumber = "vat_number"
            case logoURL = "logo_url"
            case isOwnCompany = "is_own_company"
            case residualValue = "residual_value_percentage"
            case availableDurations = "available_durations"
            case useDurationCoefficients = "use_duration_coefficients"
            case contractStartRule = "contract_start_rule"
            case billingFrequency = "billing_frequency"
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            id = try c.decode(String.self, forKey: .id)
            name = try c.decodeIfPresent(String.self, forKey: .name) ?? "Bailleur"
            companyName = try c.decodeIfPresent(String.self, forKey: .companyName)
            email = try c.decodeIfPresent(String.self, forKey: .email)
            phone = try c.decodeIfPresent(String.self, forKey: .phone)
            vatNumber = try c.decodeIfPresent(String.self, forKey: .vatNumber)
            logoURL = try c.decodeIfPresent(String.self, forKey: .logoURL)
            isOwnCompany = try c.decodeIfPresent(Bool.self, forKey: .isOwnCompany) ?? false
            residualValue = try c.decodeIfPresent(Double.self, forKey: .residualValue) ?? 0
            availableDurations = (try? c.decodeIfPresent([Int].self, forKey: .availableDurations)) as? [Int] ?? []
            useDurationCoefficients = try c.decodeIfPresent(Bool.self, forKey: .useDurationCoefficients) ?? false
            contractStartRule = try c.decodeIfPresent(String.self, forKey: .contractStartRule)
            billingFrequency = try c.decodeIfPresent(String.self, forKey: .billingFrequency)
        }

        var startRuleLabel: String {
            contractStartRule.flatMap(ContractStartRule.init)?.label ?? "1er du mois suivant"
        }
    }

    static func leasers(companyId: String) async -> [Leaser] {
        (try? await Backend.client
            .from("leasers")
            .select(Leaser.columns)
            .eq("company_id", value: companyId)
            .order("name", ascending: true)
            .execute().value) ?? []
    }

    static func ranges(leaserId: String) async -> [LeaserRangeDetail] {
        (try? await Backend.client
            .from("leaser_ranges")
            .select("id, min, max, coefficient, duration_months")
            .eq("leaser_id", value: leaserId)
            .order("duration_months", ascending: true)
            .order("min", ascending: true)
            .execute().value) ?? []
    }

    struct LeaserRangeDetail: Decodable, Identifiable, Sendable {
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

    /// Met à jour les champs d'un bailleur qui se règlent au doigt. Les tranches
    /// de coefficients, elles, restent au web : c'est une grille.
    static func updateLeaser(
        id: String,
        name: String,
        email: String,
        phone: String,
        residualValue: Double,
        startRule: ContractStartRule
    ) async -> Bool {
        func text(_ value: String) -> AnyJSON {
            let trimmed = value.trimmingCharacters(in: .whitespaces)
            return trimmed.isEmpty ? .null : .string(trimmed)
        }

        do {
            try await Backend.client
                .from("leasers")
                .update([
                    "name": .string(name.trimmingCharacters(in: .whitespaces)),
                    "email": text(email),
                    "phone": text(phone),
                    "residual_value_percentage": .double(residualValue),
                    "contract_start_rule": .string(startRule.rawValue),
                ])
                .eq("id", value: id)
                .execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    // MARK: - Commissions

    struct CommissionLevel: Decodable, Identifiable, Sendable {
        let id: String
        let name: String
        let type: String
        let calculationMode: String
        let fixedRate: Double?
        let isDefault: Bool

        static let columns = "id, name, type, calculation_mode, fixed_rate, is_default"

        enum CodingKeys: String, CodingKey {
            case id, name, type
            case calculationMode = "calculation_mode"
            case fixedRate = "fixed_rate"
            case isDefault = "is_default"
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            id = try c.decode(String.self, forKey: .id)
            name = try c.decodeIfPresent(String.self, forKey: .name) ?? "Barème"
            type = try c.decodeIfPresent(String.self, forKey: .type) ?? ""
            calculationMode = try c.decodeIfPresent(String.self, forKey: .calculationMode) ?? "tiered"
            fixedRate = try c.decodeIfPresent(Double.self, forKey: .fixedRate)
            isDefault = try c.decodeIfPresent(Bool.self, forKey: .isDefault) ?? false
        }

        var typeLabel: String {
            switch type {
            case "ambassador": return "Ambassadeur"
            case "partner":    return "Partenaire"
            default:           return type.capitalized
            }
        }

        var modeLabel: String {
            calculationMode == "fixed" ? "Taux fixe" : "Par tranches"
        }
    }

    struct CommissionRate: Decodable, Identifiable, Sendable {
        let id: String
        let levelId: String
        let minAmount: Double
        let maxAmount: Double
        let rate: Double

        static let columns = "id, commission_level_id, min_amount, max_amount, rate"

        enum CodingKeys: String, CodingKey {
            case id, rate
            case levelId = "commission_level_id"
            case minAmount = "min_amount"
            case maxAmount = "max_amount"
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            id = try c.decode(String.self, forKey: .id)
            levelId = try c.decodeIfPresent(String.self, forKey: .levelId) ?? ""
            minAmount = try c.decodeIfPresent(Double.self, forKey: .minAmount) ?? 0
            maxAmount = try c.decodeIfPresent(Double.self, forKey: .maxAmount) ?? 0
            rate = try c.decodeIfPresent(Double.self, forKey: .rate) ?? 0
        }
    }

    static func commissionLevels(companyId: String) async -> [CommissionLevel] {
        (try? await Backend.client
            .from("commission_levels")
            .select(CommissionLevel.columns)
            .eq("company_id", value: companyId)
            .order("name", ascending: true)
            .execute().value) ?? []
    }

    static func commissionRates(companyId: String) async -> [CommissionRate] {
        (try? await Backend.client
            .from("commission_rates")
            .select(CommissionRate.columns)
            .eq("company_id", value: companyId)
            .order("min_amount", ascending: true)
            .execute().value) ?? []
    }

    // MARK: - Société

    struct Customization: Decodable, Sendable {
        let companyName: String?
        let companyAddress: String?
        let companyCity: String?
        let companyPostalCode: String?
        let companyCountry: String?
        let companyEmail: String?
        let companyPhone: String?
        let companyVatNumber: String?
        let logoURL: String?
        let primaryColor: String?
        let secondaryColor: String?
        let accentColor: String?
        let customDomain: String?
        let quoteRequestURL: String?
        let paymentDay: Int?

        static let columns = """
            company_name, company_address, company_city, company_postal_code, \
            company_country, company_email, company_phone, company_vat_number, \
            logo_url, primary_color, secondary_color, accent_color, custom_domain, \
            quote_request_url, payment_day
            """

        enum CodingKeys: String, CodingKey {
            case companyName = "company_name"
            case companyAddress = "company_address"
            case companyCity = "company_city"
            case companyPostalCode = "company_postal_code"
            case companyCountry = "company_country"
            case companyEmail = "company_email"
            case companyPhone = "company_phone"
            case companyVatNumber = "company_vat_number"
            case logoURL = "logo_url"
            case primaryColor = "primary_color"
            case secondaryColor = "secondary_color"
            case accentColor = "accent_color"
            case customDomain = "custom_domain"
            case quoteRequestURL = "quote_request_url"
            case paymentDay = "payment_day"
        }
    }

    static func customization(companyId: String) async -> Customization? {
        let rows: [Customization] = (try? await Backend.client
            .from("company_customizations")
            .select(Customization.columns)
            .eq("company_id", value: companyId)
            .limit(1)
            .execute().value) ?? []
        return rows.first
    }

    static func updateCustomization(
        companyId: String,
        _ values: [String: AnyJSON]
    ) async -> Bool {
        do {
            try await Backend.client
                .from("company_customizations")
                .update(values)
                .eq("company_id", value: companyId)
                .execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    // MARK: - Intégrations

    struct Integration: Decodable, Identifiable, Sendable {
        let id: String
        let type: String
        let isEnabled: Bool
        let updatedAt: Date?

        // On ne lit jamais `api_credentials` : les secrets n'ont rien à faire
        // sur un écran de téléphone.
        static let columns = "id, integration_type, is_enabled, updated_at"

        enum CodingKeys: String, CodingKey {
            case id
            case type = "integration_type"
            case isEnabled = "is_enabled"
            case updatedAt = "updated_at"
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            id = try c.decode(String.self, forKey: .id)
            type = try c.decodeIfPresent(String.self, forKey: .type) ?? ""
            isEnabled = try c.decodeIfPresent(Bool.self, forKey: .isEnabled) ?? false
            if let raw = try c.decodeIfPresent(String.self, forKey: .updatedAt) {
                updatedAt = Format.parseDate(raw)
            } else { updatedAt = nil }
        }

        var label: String {
            switch type {
            case "billit":  return "Billit — facturation"
            case "grenke":  return "Grenke — financement"
            case "graydon": return "Graydon — solvabilité"
            case "adios":   return "AdiOS"
            case "mdm":     return "MDM — gestion de flotte"
            case "tulip":   return "Tulip — assurance"
            case "yuki":    return "Yuki — comptabilité"
            case "mollie":  return "Mollie — prélèvements"
            default:        return type.capitalized
            }
        }

        var icon: String {
            switch type {
            case "billit", "yuki": return "doc.text.fill"
            case "grenke":         return "building.columns.fill"
            case "graydon":        return "chart.bar.fill"
            case "mdm":            return "iphone.gen3"
            case "tulip":          return "shield.lefthalf.filled"
            case "mollie":         return "creditcard.fill"
            default:               return "puzzlepiece.extension.fill"
            }
        }
    }

    static func integrations(companyId: String) async -> [Integration] {
        (try? await Backend.client
            .from("company_integrations")
            .select(Integration.columns)
            .eq("company_id", value: companyId)
            .order("integration_type", ascending: true)
            .execute().value) ?? []
    }

    static func setIntegration(id: String, enabled: Bool) async -> Bool {
        do {
            try await Backend.client
                .from("company_integrations")
                .update(["is_enabled": AnyJSON.bool(enabled)])
                .eq("id", value: id)
                .execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    // MARK: - Contenus

    struct ContentBlock: Decodable, Identifiable, Sendable {
        let id: String
        let pageName: String
        let blockKey: String
        let content: String

        static let columns = "id, page_name, block_key, content"

        enum CodingKeys: String, CodingKey {
            case id, content
            case pageName = "page_name"
            case blockKey = "block_key"
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            id = try c.decode(String.self, forKey: .id)
            pageName = try c.decodeIfPresent(String.self, forKey: .pageName) ?? ""
            blockKey = try c.decodeIfPresent(String.self, forKey: .blockKey) ?? ""
            content = try c.decodeIfPresent(String.self, forKey: .content) ?? ""
        }

        /// Libellé lisible : les clés du web sont techniques.
        var label: String {
            switch blockKey {
            case "greeting":                 return "Formule d'accueil"
            case "introduction":             return "Introduction"
            case "validity":                 return "Validité de l'offre"
            case "title":                    return "Titre"
            case "footer_note":              return "Note de bas de page"
            case "general_conditions":       return "Conditions générales"
            case "sale_general_conditions":  return "Conditions générales de vente"
            case "additional_info":          return "Informations complémentaires"
            case "contact_info":             return "Coordonnées"
            default:                         return blockKey.replacingOccurrences(of: "_", with: " ").capitalized
            }
        }

        var pageLabel: String {
            switch pageName {
            case "cover":      return "Page de garde"
            case "equipment":  return "Équipements"
            case "conditions": return "Conditions"
            default:           return pageName.capitalized
            }
        }
    }

    static func contentBlocks(companyId: String) async -> [ContentBlock] {
        (try? await Backend.client
            .from("pdf_content_blocks")
            .select(ContentBlock.columns)
            .eq("company_id", value: companyId)
            .order("page_name", ascending: true)
            .execute().value) ?? []
    }

    static func updateContentBlock(id: String, content: String) async -> Bool {
        do {
            try await Backend.client
                .from("pdf_content_blocks")
                .update(["content": AnyJSON.string(content)])
                .eq("id", value: id)
                .execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    struct EmailTemplate: Decodable, Identifiable, Sendable {
        let id: Int
        let name: String
        let type: String
        let subject: String
        let isActive: Bool

        static let columns = "id, name, type, subject, active"

        enum CodingKeys: String, CodingKey {
            case id, name, type, subject
            case isActive = "active"
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            id = try c.decode(Int.self, forKey: .id)
            name = try c.decodeIfPresent(String.self, forKey: .name) ?? ""
            type = try c.decodeIfPresent(String.self, forKey: .type) ?? ""
            subject = try c.decodeIfPresent(String.self, forKey: .subject) ?? ""
            isActive = try c.decodeIfPresent(Bool.self, forKey: .isActive) ?? false
        }
    }

    static func emailTemplates(companyId: String) async -> [EmailTemplate] {
        (try? await Backend.client
            .from("email_templates")
            .select(EmailTemplate.columns)
            .eq("company_id", value: companyId)
            .order("name", ascending: true)
            .execute().value) ?? []
    }

    static func setEmailTemplate(id: Int, subject: String, active: Bool) async -> Bool {
        do {
            try await Backend.client
                .from("email_templates")
                .update([
                    "subject": AnyJSON.string(subject),
                    "active": .bool(active),
                ])
                .eq("id", value: id)
                .execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    // MARK: - Abonnement

    struct Subscription: Decodable, Sendable {
        let plan: String
        let isActive: Bool?
        let periodStart: Date?
        let periodEnd: Date?

        static let columns = "plan, is_active, current_period_start, current_period_end"

        enum CodingKeys: String, CodingKey {
            case plan
            case isActive = "is_active"
            case periodStart = "current_period_start"
            case periodEnd = "current_period_end"
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            plan = try c.decodeIfPresent(String.self, forKey: .plan) ?? "—"
            isActive = try c.decodeIfPresent(Bool.self, forKey: .isActive)
            func date(_ key: CodingKeys) throws -> Date? {
                guard let raw = try c.decodeIfPresent(String.self, forKey: key) else { return nil }
                return Format.parseDate(raw)
            }
            periodStart = try date(.periodStart)
            periodEnd = try date(.periodEnd)
        }
    }

    static func subscription(companyId: String) async -> Subscription? {
        let rows: [Subscription] = (try? await Backend.client
            .from("subscriptions")
            .select(Subscription.columns)
            .eq("company_id", value: companyId)
            .order("created_at", ascending: false)
            .limit(1)
            .execute().value) ?? []
        return rows.first
    }

    struct CompanyInfo: Decodable, Sendable {
        let name: String
        let plan: String?
        let modulesEnabled: [String]
        let contractPrefix: String?
        let googleReviewURL: String?

        static let columns = "name, plan, modules_enabled, contract_prefix, google_review_url"

        enum CodingKeys: String, CodingKey {
            case name, plan
            case modulesEnabled = "modules_enabled"
            case contractPrefix = "contract_prefix"
            case googleReviewURL = "google_review_url"
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            name = try c.decodeIfPresent(String.self, forKey: .name) ?? ""
            plan = try c.decodeIfPresent(String.self, forKey: .plan)
            modulesEnabled = (try? c.decodeIfPresent([String].self, forKey: .modulesEnabled)) as? [String] ?? []
            contractPrefix = try c.decodeIfPresent(String.self, forKey: .contractPrefix)
            googleReviewURL = try c.decodeIfPresent(String.self, forKey: .googleReviewURL)
        }
    }

    static func companyInfo(companyId: String) async -> CompanyInfo? {
        let rows: [CompanyInfo] = (try? await Backend.client
            .from("companies")
            .select(CompanyInfo.columns)
            .eq("id", value: companyId)
            .limit(1)
            .execute().value) ?? []
        return rows.first
    }
}
