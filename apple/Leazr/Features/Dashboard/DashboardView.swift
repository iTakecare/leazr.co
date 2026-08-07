import Foundation
import Observation
import SwiftUI
import Supabase

@MainActor
@Observable
final class DashboardStore {
    private(set) var metrics: DashboardMetrics?
    private(set) var isLoading = false
    var errorMessage: String?

    func load() async {
        isLoading = true
        defer { isLoading = false }

        do {
            // Même RPC que le web : le calcul reste côté serveur.
            let rows: [DashboardMetrics] = try await Backend.client
                .rpc("get_company_dashboard_metrics")
                .execute()
                .value
            metrics = rows.first
            errorMessage = nil
        } catch {
            errorMessage = "Impossible de charger les indicateurs."
        }
    }
}

struct DashboardView: View {

    @Environment(AuthStore.self) private var auth
    @State private var store = DashboardStore()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    if let error = store.errorMessage {
                        ErrorBanner(message: error)
                    }

                    if let m = store.metrics {
                        highlight(m)
                        grid(m)
                    } else if store.isLoading {
                        ProgressView()
                            .tint(Theme.mutedForeground)
                            .padding(.top, 60)
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Tableau de bord")
            .toolbar { ProfileMenu() }
            .refreshable { await store.load() }
            .task { if store.metrics == nil { await store.load() } }
        }
    }

    // MARK: - Sous-vues

    /// Le chiffre d'affaires, mis en avant : c'est celui qu'on regarde en premier.
    private func highlight(_ m: DashboardMetrics) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Chiffre d'affaires")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(.white.opacity(0.8))

            Text(Format.currency(m.totalRevenue))
                .font(.system(size: 36, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .contentTransition(.numericText())
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(22)
        .background(
            RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [Theme.primary, Theme.primary.opacity(0.75)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        )
    }

    private func grid(_ m: DashboardMetrics) -> some View {
        LazyVGrid(
            columns: [GridItem(.flexible(), spacing: 14), GridItem(.flexible(), spacing: 14)],
            spacing: 14
        ) {
            StatTile(icon: "doc.text.fill", label: "Offres", value: "\(m.totalOffers)")
            StatTile(icon: "clock.fill", label: "En attente", value: "\(m.pendingOffers)")
            StatTile(icon: "checkmark.seal.fill", label: "Contrats actifs", value: "\(m.activeContracts)")
            StatTile(icon: "person.2.fill", label: "Clients", value: "\(m.totalClients)")
        }
    }
}

/// Tuile d'indicateur — format carré, lisible d'un coup d'œil.
struct StatTile: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 18, weight: .medium))
                .foregroundStyle(Theme.primary)

            Spacer(minLength: 0)

            Text(value)
                .font(.system(size: 26, weight: .bold, design: .rounded))
                .foregroundStyle(Theme.foreground)

            Text(label)
                .font(.system(size: 13))
                .foregroundStyle(Theme.mutedForeground)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .frame(height: 128)
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                .fill(Theme.surface)
        )
    }
}

/// Menu de compte, partagé par les écrans principaux.
struct ProfileMenu: ToolbarContent {
    @Environment(AuthStore.self) private var auth

    var body: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Menu {
                if case .signedIn(let email) = auth.state {
                    Text(email)
                }

                if auth.biometry != .none, !auth.biometricsEnabled {
                    Button {
                        Task { _ = await auth.enableBiometrics() }
                    } label: {
                        Label("Activer \(auth.biometry.label)", systemImage: auth.biometry.symbol)
                    }
                }

                Divider()

                Button(role: .destructive) {
                    Task { await auth.signOut() }
                } label: {
                    Label("Se déconnecter", systemImage: "rectangle.portrait.and.arrow.right")
                }
            } label: {
                Image(systemName: "person.crop.circle")
                    .font(.system(size: 20))
            }
        }
    }
}
