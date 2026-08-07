import Foundation
import Observation
import Supabase

/// État d'authentification de l'application.
///
/// Le déverrouillage biométrique est un état à part entière (`.locked`) : une
/// session Supabase valide ne suffit pas à afficher les données, il faut aussi
/// avoir passé Face ID. C'est ce qui distingue une app de gestion sérieuse
/// d'une WebView qui reste ouverte sur le dernier écran consulté.
@MainActor
@Observable
final class AuthStore {

    enum State: Equatable {
        /// Vérification de la session au lancement.
        case launching
        /// Session valide, en attente du déverrouillage biométrique.
        case locked(email: String)
        /// Aucune session : écran de connexion.
        case signedOut
        /// Session valide et déverrouillée.
        case signedIn(email: String)
    }

    private(set) var state: State = .launching

    /// Message d'erreur destiné à l'écran de connexion.
    var errorMessage: String?

    /// Vrai pendant un appel réseau, pour désactiver le formulaire.
    private(set) var isWorking = false

    /// Biométrie disponible sur cet appareil.
    let biometry = BiometricService.available

    /// L'utilisateur a-t-il activé le déverrouillage biométrique ?
    var biometricsEnabled: Bool {
        get { Keychain.get(Keychain.Key.biometricsEnabled) == "1" }
        set { Keychain.set(newValue ? "1" : "0", for: Keychain.Key.biometricsEnabled) }
    }

    /// Dernière adresse utilisée, pour pré-remplir le champ.
    var lastEmail: String? { Keychain.get(Keychain.Key.lastEmail) }

    // MARK: - Cycle de vie

    /// Décide de l'écran d'accueil au lancement.
    func bootstrap() async {
        do {
            let session = try await Backend.client.auth.session
            let email = session.user.email ?? lastEmail ?? ""

            // Session valide : on verrouille si l'utilisateur a activé Face ID,
            // sinon on entre directement.
            if biometricsEnabled, biometry != .none {
                state = .locked(email: email)
            } else {
                state = .signedIn(email: email)
            }
        } catch {
            state = .signedOut
        }
    }

    // MARK: - Connexion

    func signIn(email: String, password: String) async {
        guard !isWorking else { return }
        isWorking = true
        errorMessage = nil
        defer { isWorking = false }

        do {
            let session = try await Backend.client.auth.signIn(
                email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                password: password
            )
            Keychain.set(session.user.email ?? email, for: Keychain.Key.lastEmail)
            state = .signedIn(email: session.user.email ?? email)
        } catch {
            errorMessage = Self.readableMessage(for: error)
        }
    }

    // MARK: - Déverrouillage biométrique

    func unlockWithBiometrics() async {
        guard case .locked(let email) = state else { return }
        errorMessage = nil

        do {
            try await BiometricService.authenticate(
                reason: "Déverrouiller Leazr"
            )
            state = .signedIn(email: email)
        } catch BiometricService.Failure.cancelled {
            // L'utilisateur a choisi le mot de passe : on ne montre pas d'erreur,
            // on le laisse simplement sur l'écran verrouillé.
        } catch BiometricService.Failure.unavailable {
            // La biométrie a été désactivée depuis la dernière session : on
            // retombe proprement sur la connexion classique.
            biometricsEnabled = false
            state = .signedOut
        } catch {
            errorMessage = "Déverrouillage impossible. Réessayez ou utilisez votre mot de passe."
        }
    }

    /// Active la biométrie après une première connexion réussie.
    func enableBiometrics() async -> Bool {
        guard biometry != .none else { return false }
        do {
            try await BiometricService.authenticate(
                reason: "Activer le déverrouillage de Leazr par \(biometry.label)"
            )
            biometricsEnabled = true
            return true
        } catch {
            return false
        }
    }

    /// Reverrouille l'app quand elle passe en arrière-plan.
    /// Sans effet si la biométrie n'est pas active : on ne va pas enfermer
    /// dehors un utilisateur qui n'a pas de moyen de rentrer.
    func lockIfNeeded() {
        guard case .signedIn(let email) = state,
              biometricsEnabled,
              biometry != .none
        else { return }

        state = .locked(email: email)
    }

    // MARK: - Déconnexion

    /// Revient à l'écran de connexion sans fermer la session côté serveur —
    /// utilisé quand l'utilisateur préfère saisir son mot de passe.
    func requestPasswordSignIn() {
        state = .signedOut
    }

    func signOut() async {
        try? await Backend.client.auth.signOut()
        biometricsEnabled = false
        state = .signedOut
    }

    // MARK: - Erreurs

    /// Traduit les erreurs techniques en messages utilisables.
    private static func readableMessage(for error: Error) -> String {
        let raw = error.localizedDescription.lowercased()

        if raw.contains("invalid login") || raw.contains("invalid credentials") {
            return "Adresse e-mail ou mot de passe incorrect."
        }
        if raw.contains("email not confirmed") {
            return "Votre adresse n'a pas encore été confirmée."
        }
        if raw.contains("network") || raw.contains("offline") || raw.contains("connexion") {
            return "Connexion impossible. Vérifiez votre réseau."
        }
        return "La connexion a échoué. Réessayez dans un instant."
    }
}
