import SwiftUI

// MARK: - Logo

/// Marque Leazr, posée sur une pastille claire pour rester lisible dans les
/// deux apparences.
struct LogoMark: View {
    var size: CGFloat = 64

    var body: some View {
        Image("LogoMark")
            .resizable()
            .scaledToFit()
            .padding(size * 0.16)
            .frame(width: size, height: size)
            .background(
                RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
                    .fill(.white)
                    .shadow(color: .black.opacity(0.12), radius: 14, y: 6)
            )
    }
}

// MARK: - Champ de saisie

/// Champ de formulaire aux dimensions iOS : hauteur confortable, icône de
/// contexte, et bordure qui s'anime au focus.
struct LeazrField: View {

    let icon: String
    let placeholder: String
    @Binding var text: String

    var isSecure = false
    var textContentType: UITextContentType?
    var keyboardType: UIKeyboardType = .default

    @FocusState private var isFocused: Bool
    @State private var isRevealed = false

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(isFocused ? Theme.primary : Theme.mutedForeground)
                .frame(width: 22)

            Group {
                if isSecure && !isRevealed {
                    SecureField(placeholder, text: $text)
                } else {
                    TextField(placeholder, text: $text)
                }
            }
            .focused($isFocused)
            .textContentType(textContentType)
            .keyboardType(keyboardType)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .font(.system(size: 17))
            .foregroundStyle(Theme.foreground)

            if isSecure {
                Button {
                    isRevealed.toggle()
                } label: {
                    Image(systemName: isRevealed ? "eye.slash.fill" : "eye.fill")
                        .font(.system(size: 15))
                        .foregroundStyle(Theme.mutedForeground)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 16)
        .frame(height: 54)
        .background(
            RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                .fill(Theme.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                .strokeBorder(
                    isFocused ? Theme.primary : Theme.border,
                    lineWidth: isFocused ? 1.6 : 1
                )
        )
        .animation(.easeOut(duration: 0.18), value: isFocused)
    }
}

// MARK: - Boutons

/// Bouton d'action principal : pleine largeur, retour haptique, et état de
/// chargement intégré pour éviter les doubles envois.
struct PrimaryButton: View {

    let title: String
    var systemImage: String?
    var isLoading = false
    var isEnabled = true
    let action: () -> Void

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            action()
        } label: {
            HStack(spacing: 10) {
                if isLoading {
                    ProgressView().tint(.white)
                } else {
                    if let systemImage {
                        Image(systemName: systemImage)
                            .font(.system(size: 17, weight: .semibold))
                    }
                    Text(title)
                        .font(.system(size: 17, weight: .semibold))
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .foregroundStyle(.white)
            .background(
                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                    .fill(Theme.primary)
            )
        }
        .buttonStyle(PressableStyle())
        .disabled(!isEnabled || isLoading)
        .opacity(isEnabled && !isLoading ? 1 : 0.55)
    }
}

/// Action secondaire, sans fond.
struct TertiaryButton: View {
    let title: String
    var systemImage: String?
    let action: () -> Void

    init(title: String, systemImage: String? = nil, action: @escaping () -> Void) {
        self.title = title
        self.systemImage = systemImage
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 7) {
                if let systemImage {
                    Image(systemName: systemImage).font(.system(size: 14, weight: .semibold))
                }
                Text(title)
                    .font(.system(size: 16, weight: .medium))
            }
            .foregroundStyle(Theme.primary)
        }
        .buttonStyle(PressableStyle())
    }
}

/// Enfoncement subtil au toucher — le détail qui fait « natif ».
struct PressableStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .opacity(configuration.isPressed ? 0.85 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

// MARK: - Message d'erreur

struct ErrorBanner: View {
    let message: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 15))
            Text(message)
                .font(.system(size: 14, weight: .medium))
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .foregroundStyle(Theme.destructive)
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                .fill(Theme.destructive.opacity(0.12))
        )
        .transition(.opacity.combined(with: .move(edge: .top)))
    }
}
