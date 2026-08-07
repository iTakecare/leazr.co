import Foundation
import Security

/// Petit accès au trousseau iOS pour les préférences sensibles.
///
/// On n'y stocke pas la session : le SDK Supabase s'en charge déjà. On y garde
/// seulement de quoi préparer le déverrouillage biométrique — l'adresse du
/// dernier compte connecté et le fait que l'utilisateur ait activé Face ID.
///
/// `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` : lisible en tâche de
/// fond après le premier déverrouillage du téléphone, et jamais transféré vers
/// un autre appareil par une sauvegarde.
enum Keychain {

    private static let service = "co.leazr.ios.account"

    // MARK: - API

    static func set(_ value: String, for key: String) {
        guard let data = value.data(using: .utf8) else { return }

        var query = baseQuery(for: key)
        SecItemDelete(query as CFDictionary)

        query[kSecValueData as String] = data
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly

        SecItemAdd(query as CFDictionary, nil)
    }

    static func get(_ key: String) -> String? {
        var query = baseQuery(for: key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data
        else { return nil }

        return String(data: data, encoding: .utf8)
    }

    static func remove(_ key: String) {
        SecItemDelete(baseQuery(for: key) as CFDictionary)
    }

    // MARK: - Clés connues

    enum Key {
        static let lastEmail = "last-email"
        static let biometricsEnabled = "biometrics-enabled"
    }

    // MARK: - Interne

    private static func baseQuery(for key: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
    }
}
