import Foundation
import SwiftUI
import UIKit

/// Composition d'un appel depuis l'application.
///
/// Sur le terrain, l'appel ne part pas forcément par l'app Téléphone : les
/// numéros professionnels passent par un softphone (Interfone, 3CX, Zoiper…)
/// pour que l'appel soit tracé et facturé sur la ligne de l'entreprise. On
/// détecte les applications réellement installées et on laisse le choix, avec
/// une préférence mémorisée.
@MainActor
enum Dialer {

    /// Normalise un numéro tel qu'il arrive de la base.
    ///
    /// Les imports Meta et les fiches anciennes portent des préfixes (`p:`,
    /// `tel:`), des espaces, des points et des parenthèses. Les passer tels
    /// quels à une URL `tel:` produit un appel qui échoue en silence.
    static func normalize(_ raw: String?) -> String? {
        guard var value = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty else {
            return nil
        }

        // Préfixes de champ hérités des imports : « p: », « t: », « tel: ».
        for prefix in ["tel:", "phone:", "p:", "t:", "m:"] where value.lowercased().hasPrefix(prefix) {
            value = String(value.dropFirst(prefix.count))
            break
        }

        let plus = value.trimmingCharacters(in: .whitespaces).hasPrefix("+")
        let digits = value.filter(\.isNumber)
        guard digits.count >= 6 else { return nil }
        return plus ? "+\(digits)" : digits
    }

    /// Forme lisible : le numéro nettoyé, groupé par blocs.
    static func display(_ raw: String?) -> String? {
        guard let number = normalize(raw) else { return nil }
        guard number.hasPrefix("+") else { return number }

        // Groupement simple, suffisant pour un numéro européen : indicatif
        // pays puis blocs de deux ou trois chiffres.
        let digits = Array(number.dropFirst())
        guard digits.count > 5 else { return number }
        let country = String(digits.prefix(2))
        let rest = String(digits.dropFirst(2))
        let blocks = stride(from: 0, to: rest.count, by: 3).map { offset -> String in
            let start = rest.index(rest.startIndex, offsetBy: offset)
            let end = rest.index(start, offsetBy: min(3, rest.count - offset))
            return String(rest[start..<end])
        }
        return "+\(country) \(blocks.joined(separator: " "))"
    }

    // MARK: - Applications d'appel

    struct App: Identifiable, Hashable {
        let id: String
        let name: String
        let icon: String
        /// Modèle d'URL ; `%@` reçoit le numéro.
        let template: String
        /// Faut-il retirer le « + » ? Certains schémas SIP ne l'acceptent pas.
        var stripsPlus = false

        func url(for number: String) -> URL? {
            let value = stripsPlus ? number.replacingOccurrences(of: "+", with: "") : number
            let encoded = value.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed) ?? value
            return URL(string: template.replacingOccurrences(of: "%@", with: encoded))
        }
    }

    /// Applications connues. `sip:` est déclaré en dernier car la plupart des
    /// softphones le revendiquent : on préfère nommer l'application quand on
    /// sait la reconnaître.
    static let known: [App] = [
        App(id: "tel", name: "Téléphone", icon: "phone.fill", template: "tel://%@"),
        App(id: "interfone", name: "Interfone", icon: "antenna.radiowaves.left.and.right", template: "interfone://call?number=%@"),
        App(id: "cloudsoftphone", name: "Cloud Softphone", icon: "antenna.radiowaves.left.and.right", template: "cloudsoftphone://call?number=%@"),
        App(id: "groundwire", name: "Groundwire", icon: "antenna.radiowaves.left.and.right", template: "groundwire://%@"),
        App(id: "acrobits", name: "Acrobits Softphone", icon: "antenna.radiowaves.left.and.right", template: "acrobits://%@"),
        App(id: "zoiper", name: "Zoiper", icon: "antenna.radiowaves.left.and.right", template: "zoiper://%@"),
        App(id: "linphone", name: "Linphone", icon: "antenna.radiowaves.left.and.right", template: "linphone://call?to=%@"),
        App(id: "bria", name: "Bria", icon: "antenna.radiowaves.left.and.right", template: "bria://call?number=%@"),
        App(id: "threecx", name: "3CX", icon: "antenna.radiowaves.left.and.right", template: "tcxcall://%@"),
        App(id: "whatsapp", name: "WhatsApp", icon: "message.fill", template: "https://wa.me/%@", stripsPlus: true),
        App(id: "facetime", name: "FaceTime audio", icon: "video.fill", template: "facetime-audio://%@"),
        App(id: "sip", name: "Softphone (SIP)", icon: "antenna.radiowaves.left.and.right", template: "sip:%@"),
    ]

    /// Applications réellement présentes sur l'appareil. Nécessite que leurs
    /// schémas soient déclarés dans `LSApplicationQueriesSchemes`, sinon iOS
    /// répond systématiquement non.
    static var available: [App] {
        known.filter { app in
            guard let url = app.url(for: "+3200000000") else { return false }
            return UIApplication.shared.canOpenURL(url)
        }
    }

    // MARK: - Préférence

    private static let defaultsKey = "leazr.dialer.preferred"

    /// Application choisie par l'utilisateur, si elle est toujours installée.
    static var preferred: App? {
        get {
            guard let id = UserDefaults.standard.string(forKey: defaultsKey) else { return nil }
            return available.first { $0.id == id }
        }
        set {
            if let newValue {
                UserDefaults.standard.set(newValue.id, forKey: defaultsKey)
            } else {
                UserDefaults.standard.removeObject(forKey: defaultsKey)
            }
        }
    }

    /// Lance l'appel avec l'application demandée.
    @discardableResult
    static func call(_ raw: String?, using app: App) -> Bool {
        guard let number = normalize(raw), let url = app.url(for: number) else { return false }
        UIApplication.shared.open(url)
        return true
    }
}

// MARK: - Bouton d'appel

/// Bouton « Appeler » qui respecte le choix de l'utilisateur : appel direct si
/// une application par défaut est réglée, menu de choix sinon.
struct CallButton: View {

    let phone: String?
    var style: Style = .action

    enum Style {
        /// Pastille d'action, à côté d'e-mail et itinéraire.
        case action
        /// Ligne de fiche : le numéro lui-même devient cliquable.
        case inline
    }

    @State private var options: [Dialer.App] = []
    @State private var isChoosing = false

    private var number: String? { Dialer.normalize(phone) }

    var body: some View {
        if let number, let display = Dialer.display(phone) {
            Group {
                switch style {
                case .action:
                    Button(action: start) {
                        VStack(spacing: 5) {
                            Image(systemName: "phone.fill").font(.system(size: 16, weight: .semibold))
                            Text("Appeler").font(.system(size: 12, weight: .medium))
                        }
                        .foregroundStyle(Theme.emerald)
                        .frame(maxWidth: .infinity)
                        .frame(height: 58)
                        .background(
                            RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                .fill(Theme.emerald.opacity(0.13))
                        )
                    }
                    .buttonStyle(PressableStyle())

                case .inline:
                    Button(action: start) {
                        HStack(spacing: 6) {
                            Text(display)
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(Theme.emerald)
                            Image(systemName: "phone.fill")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundStyle(Theme.emerald)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .confirmationDialog("Appeler \(display)", isPresented: $isChoosing, titleVisibility: .visible) {
                ForEach(options) { app in
                    Button(app.name) {
                        Dialer.preferred = app
                        Dialer.call(number, using: app)
                    }
                }
                Button("Copier le numéro") {
                    UIPasteboard.general.string = number
                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                }
                Button("Annuler", role: .cancel) {}
            } message: {
                Text("Votre choix devient l'application d'appel par défaut. Vous pourrez en changer dans Réglages.")
            }
        }
    }

    /// Vrai si le numéro est exploitable : sert à masquer la ligne plutôt qu'à
    /// afficher un bouton mort.
    static func isDialable(_ phone: String?) -> Bool { Dialer.normalize(phone) != nil }

    private func start() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()

        // Une seule application installée : rien à choisir, on appelle.
        let installed = Dialer.available
        if let preferred = Dialer.preferred {
            Dialer.call(phone, using: preferred)
        } else if installed.count <= 1 {
            Dialer.call(phone, using: installed.first ?? Dialer.known[0])
        } else {
            options = installed
            isChoosing = true
        }
    }
}

/// Ligne de fiche pour un numéro : affiché proprement, et appelable d'un doigt.
/// Un numéro qu'on ne peut pas composer depuis la fiche ne sert à rien.
struct PhoneRow: View {
    var label = "Téléphone"
    let phone: String?

    var body: some View {
        if Dialer.normalize(phone) != nil {
            HStack(alignment: .top) {
                Text(label)
                    .font(.system(size: 15))
                    .foregroundStyle(Theme.mutedForeground)
                Spacer(minLength: 12)
                CallButton(phone: phone, style: .inline)
            }
            .padding(.vertical, 12)
        }
    }
}
