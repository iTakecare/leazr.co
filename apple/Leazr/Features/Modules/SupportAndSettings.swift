import Foundation
import Observation
import SwiftUI
import Supabase

// MARK: - Centre de support

struct SupportView: View {
    /// Poussé depuis « Plus » : la pile de navigation existe déjà.
    var embedded = false

    @State private var store = ListStore<SupportTicket>(
        table: "support_tickets",
        columns: "id, subject, status, priority, category, created_at",
        searchColumns: ["subject", "category"],
        matches: { t, q in
            t.subject.lowercased().contains(q)
                || (t.category?.lowercased().contains(q) ?? false)
        }
    )

    var body: some View {
        ListScreen(
            title: "Support",
            searchPrompt: "Objet ou catégorie",
            emptyIcon: "lifepreserver",
            emptyLabel: "Aucun ticket",
            wrapsNavigation: !embedded,
            store: store
        ) { ticket in
            Card {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .top) {
                        Image(systemName: "lifepreserver.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(Theme.teal)

                        Text(ticket.subject)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Theme.foreground)
                            .lineLimit(2)

                        Spacer(minLength: 8)

                        StatusBadge(label: ticket.statusLabel, status: ticket.status)
                    }

                    HStack(spacing: 8) {
                        PriorityChip(label: ticket.priorityLabel, priority: ticket.priority)

                        if let category = ticket.category {
                            Text(category)
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.mutedForeground)
                        }

                        Spacer()

                        Text(Format.date(ticket.createdAt))
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.mutedForeground)
                    }
                }
            }
        }
    }
}

struct PriorityChip: View {
    let label: String
    let priority: String

    private var tint: Color {
        switch priority {
        case "urgent": return Theme.rose
        case "high":   return Theme.amber
        case "medium": return Theme.sky
        default:       return Theme.mutedForeground
        }
    }

    var body: some View {
        Text(label)
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(tint)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Capsule().fill(tint.opacity(0.14)))
    }
}

struct SettingsSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title.uppercased())
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Theme.mutedForeground)
                .tracking(0.6)

            VStack(spacing: 0) { content }
                .background(
                    RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                        .fill(Theme.surface)
                )
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct SettingsRow: View {
    let icon: String
    let tint: Color
    let title: String
    var value: String?
    var action: (() -> Void)?

    var body: some View {
        Button {
            action?()
        } label: {
            SettingsRowContent(icon: icon, tint: tint, title: title, value: value)
        }
        .buttonStyle(PressableStyle())
        .disabled(action == nil)
    }
}

/// Contenu seul, sans bouton : nécessaire pour servir d'étiquette à un `Menu`,
/// qu'un bouton désactivé empêcherait d'ouvrir.
struct SettingsRowContent: View {
    let icon: String
    let tint: Color
    let title: String
    var value: String?

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 30, height: 30)
                .background(
                    RoundedRectangle(cornerRadius: 8, style: .continuous).fill(tint)
                )

            Text(title)
                .font(.system(size: 15))
                .foregroundStyle(Theme.foreground)

            Spacer()

            if let value {
                Text(value)
                    .font(.system(size: 15))
                    .foregroundStyle(Theme.mutedForeground)
            }

            Image(systemName: "chevron.up.chevron.down")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Theme.mutedForeground)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 13)
    }
}
