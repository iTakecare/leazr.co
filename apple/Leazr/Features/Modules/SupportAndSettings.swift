import Foundation
import Observation
import SwiftUI
import Supabase

// MARK: - Centre de support

struct SupportView: View {
    @State private var store = ListStore<SupportTicket>(
        table: "support_tickets",
        columns: "id, subject, status, priority, category, created_at",
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

// MARK: - Réglages

struct SettingsView: View {
    @Environment(AuthStore.self) private var auth
    @State private var companyId: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    accountCard

                    SettingsSection(title: "Sécurité") {
                        if auth.biometry != .none {
                            SettingsRow(
                                icon: auth.biometry.symbol,
                                tint: Theme.violet,
                                title: "Déverrouillage \(auth.biometry.label)",
                                value: auth.biometricsEnabled ? "Activé" : "Désactivé"
                            ) {
                                if !auth.biometricsEnabled {
                                    Task { _ = await auth.enableBiometrics() }
                                }
                            }
                        }
                    }

                    SettingsSection(title: "Application") {
                        SettingsRow(
                            icon: "number",
                            tint: Theme.sky,
                            title: "Version",
                            value: Self.version
                        )
                        SettingsRow(
                            icon: "building.2.fill",
                            tint: Theme.teal,
                            title: "Société",
                            value: companyId == nil ? "—" : "Rattachée"
                        )
                    }

                    Button {
                        Task { await auth.signOut() }
                    } label: {
                        Text("Se déconnecter")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Theme.destructive)
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(
                                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                    .fill(Theme.destructive.opacity(0.12))
                            )
                    }
                    .buttonStyle(PressableStyle())
                    .padding(.top, 8)
                }
                .padding(20)
                .frame(maxWidth: 700)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Réglages")
            .task { companyId = await Session.shared.resolve() }
        }
    }

    private var accountCard: some View {
        VStack(spacing: 10) {
            Image(systemName: "person.crop.circle.fill")
                .font(.system(size: 54))
                .foregroundStyle(.white)

            if case .signedIn(let email) = auth.state {
                Text(email)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.white)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 26)
        .background(
            RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                .fill(Theme.gradient(Theme.primary))
        )
    }

    private static var version: String {
        let v = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "—"
        let b = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "—"
        return "\(v) (\(b))"
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
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 13)
        }
        .buttonStyle(PressableStyle())
        .disabled(action == nil)
    }
}
