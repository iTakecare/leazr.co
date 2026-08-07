import Foundation
import LocalAuthentication

/// Déverrouillage par Face ID / Touch ID.
///
/// Important : la biométrie ne remplace pas l'authentification Supabase, elle
/// la protège. La session reste gérée par le SDK ; Face ID conditionne
/// seulement l'accès à l'app une fois la session déjà établie. Un échec
/// biométrique ne donne donc jamais accès aux données.
enum BiometricService {

    enum Kind {
        case faceID
        case touchID
        case opticID
        case none

        var label: String {
            switch self {
            case .faceID:  return "Face ID"
            case .touchID: return "Touch ID"
            case .opticID: return "Optic ID"
            case .none:    return "biométrie"
            }
        }

        var symbol: String {
            switch self {
            case .faceID:  return "faceid"
            case .touchID: return "touchid"
            case .opticID: return "opticid"
            case .none:    return "lock.fill"
            }
        }
    }

    enum Failure: Error {
        /// L'utilisateur a annulé, ou a choisi de saisir son mot de passe.
        case cancelled
        /// Biométrie indisponible ou non configurée sur l'appareil.
        case unavailable
        /// Échec effectif de la reconnaissance.
        case failed(String)
    }

    /// Type de biométrie proposé par l'appareil, `.none` si aucun.
    static var available: Kind {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return .none
        }

        switch context.biometryType {
        case .faceID:  return .faceID
        case .touchID: return .touchID
        case .opticID: return .opticID
        default:       return .none
        }
    }

    /// Demande une vérification biométrique.
    ///
    /// On utilise `deviceOwnerAuthentication` (et non `...WithBiometrics`) pour
    /// que le code de l'appareil serve de repli si le visage n'est pas reconnu —
    /// sinon un utilisateur avec un masque ou des lunettes reste bloqué dehors.
    static func authenticate(reason: String) async throws {
        let context = LAContext()
        context.localizedCancelTitle = "Utiliser le mot de passe"

        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            throw Failure.unavailable
        }

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthentication,
                localizedReason: reason
            )
            guard success else { throw Failure.failed("Vérification refusée.") }
        } catch let laError as LAError {
            switch laError.code {
            case .userCancel, .appCancel, .systemCancel, .userFallback:
                throw Failure.cancelled
            case .biometryNotAvailable, .biometryNotEnrolled, .passcodeNotSet:
                throw Failure.unavailable
            default:
                throw Failure.failed(laError.localizedDescription)
            }
        }
    }
}
