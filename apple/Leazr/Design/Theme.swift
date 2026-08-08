import SwiftUI

/// Jetons de design repris de l'application web (`src/index.css`), pour que
/// l'app native et le SaaS partagent la même identité visuelle.
///
/// Les couleurs sont dynamiques : elles suivent le mode clair/sombre du système
/// sans qu'aucune vue n'ait à s'en préoccuper.
enum Theme {

    // MARK: - Couleurs

    /// Indigo de marque — `hsl(228 76% 52%)`.
    static let primary = dynamic(
        light: Color(red: 0.157, green: 0.302, blue: 0.886),
        dark: Color(red: 0.302, green: 0.435, blue: 0.949)
    )

    /// Fond d'écran général.
    static let background = dynamic(
        light: Color(red: 0.945, green: 0.953, blue: 0.965),
        dark: Color(red: 0.031, green: 0.047, blue: 0.086)
    )

    /// Surfaces posées sur le fond (cartes, feuilles).
    static let surface = dynamic(
        light: .white,
        dark: Color(red: 0.055, green: 0.078, blue: 0.129)
    )

    /// Texte principal.
    static let foreground = dynamic(
        light: Color(red: 0.059, green: 0.090, blue: 0.165),
        dark: Color(red: 0.973, green: 0.980, blue: 0.988)
    )

    /// Texte secondaire, libellés, aides.
    static let mutedForeground = dynamic(
        light: Color(red: 0.420, green: 0.478, blue: 0.549),
        dark: Color(red: 0.580, green: 0.639, blue: 0.722)
    )

    /// Bordures et séparateurs.
    static let border = dynamic(
        light: Color(red: 0.886, green: 0.906, blue: 0.925),
        dark: Color(red: 0.129, green: 0.180, blue: 0.271)
    )

    /// Erreurs et actions destructrices.
    static let destructive = dynamic(
        light: Color(red: 0.937, green: 0.267, blue: 0.267),
        dark: Color(red: 0.973, green: 0.443, blue: 0.443)
    )

    // MARK: - Palette d'accents

    /// Chaque module a sa couleur. Ce n'est pas décoratif : sur une app qu'on
    /// consulte vite, la couleur identifie l'écran avant même la lecture.
    static let violet = dynamic(
        light: Color(red: 0.494, green: 0.290, blue: 0.898),
        dark: Color(red: 0.655, green: 0.545, blue: 0.980)
    )

    static let teal = dynamic(
        light: Color(red: 0.031, green: 0.616, blue: 0.612),
        dark: Color(red: 0.176, green: 0.831, blue: 0.749)
    )

    static let amber = dynamic(
        light: Color(red: 0.851, green: 0.467, blue: 0.023),
        dark: Color(red: 0.984, green: 0.749, blue: 0.141)
    )

    static let rose = dynamic(
        light: Color(red: 0.882, green: 0.114, blue: 0.408),
        dark: Color(red: 0.984, green: 0.443, blue: 0.635)
    )

    static let emerald = dynamic(
        light: Color(red: 0.020, green: 0.588, blue: 0.412),
        dark: Color(red: 0.204, green: 0.827, blue: 0.600)
    )

    static let sky = dynamic(
        light: Color(red: 0.007, green: 0.518, blue: 0.780),
        dark: Color(red: 0.220, green: 0.741, blue: 0.973)
    )

    /// Dégradé doux pour les cartes de tête, à partir d'une couleur d'accent.
    static func gradient(_ color: Color) -> LinearGradient {
        LinearGradient(
            colors: [color, color.opacity(0.70)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    // MARK: - Formes

    /// Rayon des champs et boutons. Généreux : c'est ce qui distingue une
    /// interface iOS moderne d'un portage web.
    static let cornerRadius: CGFloat = 14

    /// Rayon des grandes surfaces (cartes, feuilles).
    static let cardRadius: CGFloat = 22

    // MARK: - Outils

    /// Compose une couleur qui bascule automatiquement avec l'apparence système.
    private static func dynamic(light: Color, dark: Color) -> Color {
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark ? UIColor(dark) : UIColor(light)
        })
    }
}
