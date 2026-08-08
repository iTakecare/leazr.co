import Foundation
import Observation
import Supabase

/// Contexte de la session : identifiant utilisateur et société de rattachement.
///
/// Le `company_id` vit dans `profiles`, pas dans le jeton. Il est indispensable
/// pour créer une offre : les politiques RLS filtrent en lecture, mais une
/// insertion doit désigner explicitement sa société.
@MainActor
@Observable
final class Session {

    static let shared = Session()
    private init() {}

    private(set) var companyId: String?
    private(set) var userId: String?

    private struct Profile: Decodable {
        let companyId: String?
        enum CodingKeys: String, CodingKey { case companyId = "company_id" }
    }

    /// Résout le profil une fois par session ; les appels suivants sont gratuits.
    @discardableResult
    func resolve() async -> String? {
        if let companyId { return companyId }

        do {
            let user = try await Backend.client.auth.session.user
            userId = user.id.uuidString

            // RPC et non requête directe : les politiques RLS de `profiles`
            // bloquent la lecture (récursion), c'est pourquoi le web passe lui
            // aussi par get_current_user_profile.
            let profiles: [Profile] = try await Backend.client
                .rpc("get_current_user_profile")
                .execute()
                .value

            companyId = profiles.first?.companyId
        } catch {
            companyId = nil
        }

        return companyId
    }

    func clear() {
        companyId = nil
        userId = nil
    }
}
