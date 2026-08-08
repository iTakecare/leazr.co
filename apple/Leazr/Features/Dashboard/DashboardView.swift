import Charts
import Foundation
import Observation
import SwiftUI
import Supabase

@MainActor
@Observable
final class DashboardStore {
    private(set) var metrics: DashboardMetrics?
    private(set) var months: [MonthlyFinancialData] = []
    private(set) var forecast: ContractStatistics?
    private(set) var isLoading = false
    var errorMessage: String?

    var year: Int = Calendar.current.component(.year, from: .now) {
        didSet { Task { await loadMonthly() } }
    }

    var totals: YearTotals { YearTotals(months) }

    /// Les cinq dernières années, comme le sélecteur du web.
    var yearOptions: [Int] {
        let current = Calendar.current.component(.year, from: .now)
        return (0..<5).map { current - $0 }
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        async let a: Void = loadMetrics()
        async let b: Void = loadMonthly()
        _ = await (a, b)
    }

    private func loadMetrics() async {
        do {
            let rows: [DashboardMetrics] = try await Backend.client
                .rpc("get_company_dashboard_metrics")
                .execute()
                .value
            metrics = rows.first
        } catch {
            errorMessage = "Impossible de charger les indicateurs."
        }
    }

    private func loadMonthly() async {
        do {
            months = try await Backend.client
                .rpc("get_monthly_financial_data", params: ["p_year": year])
                .execute()
                .value

            let stats: [ContractStatistics] = try await Backend.client
                .rpc("get_contract_statistics_by_status", params: ["p_year": year])
                .execute()
                .value
            forecast = stats.first { $0.status == "forecast" }

            errorMessage = nil
        } catch {
            errorMessage = "Impossible de charger les données financières."
        }
    }
}

struct DashboardView: View {

    @State private var store = DashboardStore()
    @State private var tab: Tab = .financial

    enum Tab: String, CaseIterable {
        case financial = "Financier"
        case commercial = "Commercial"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if let error = store.errorMessage {
                        ErrorBanner(message: error)
                    }

                    yearPicker

                    Picker("Vue", selection: $tab) {
                        ForEach(Tab.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)

                    switch tab {
                    case .financial:  financialSection
                    case .commercial: commercialSection
                    }
                }
                .padding(20)
                .frame(maxWidth: 700)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Tableau de bord")
            .toolbar { ProfileMenu() }
            .refreshable { await store.load() }
            .task { if store.metrics == nil { await store.load() } }
        }
    }

    // MARK: - Année

    private var yearPicker: some View {
        Menu {
            ForEach(store.yearOptions, id: \.self) { y in
                Button("\(String(y))") { store.year = y }
            }
        } label: {
            HStack(spacing: 6) {
                Text(String(store.year))
                    .font(.system(size: 15, weight: .semibold))
                Image(systemName: "chevron.up.chevron.down")
                    .font(.system(size: 11, weight: .semibold))
            }
            .foregroundStyle(Theme.foreground)
            .padding(.horizontal, 14)
            .padding(.vertical, 9)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(Theme.surface)
            )
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Financier

    private var financialSection: some View {
        let t = store.totals

        return VStack(spacing: 14) {
            HighlightCard(
                label: "Chiffre d'affaires \(String(store.year))",
                value: Format.currency(t.revenue)
            )

            LazyVGrid(
                columns: [GridItem(.flexible(), spacing: 14), GridItem(.flexible(), spacing: 14)],
                spacing: 14
            ) {
                StatTile(icon: "cart.fill", tint: Theme.amber, label: "Achats totaux", value: Format.currency(t.purchases))
                StatTile(icon: "chart.line.uptrend.xyaxis", tint: Theme.emerald, label: "Marge brute", value: Format.currency(t.margin))
                StatTile(icon: "percent", tint: Theme.violet, label: "Taux de marge", value: String(format: "%.1f %%", t.marginRate))
                StatTile(icon: "doc.text.fill", tint: Theme.sky, label: "Contrats", value: "\(t.contracts)")
            }

            if let f = store.forecast, f.count > 0 {
                ForecastCard(stats: f)
            }

            if !store.months.isEmpty {
                RevenueChart(months: store.months)
            }
        }
    }

    // MARK: - Commercial

    private var commercialSection: some View {
        let t = store.totals
        let m = store.metrics

        return VStack(spacing: 14) {
            LazyVGrid(
                columns: [GridItem(.flexible(), spacing: 14), GridItem(.flexible(), spacing: 14)],
                spacing: 14
            ) {
                StatTile(icon: "doc.text.fill", tint: Theme.sky, label: "Offres", value: "\(m?.totalOffers ?? 0)")
                StatTile(icon: "clock.fill", tint: Theme.amber, label: "En attente", value: "\(m?.pendingOffers ?? 0)")
                StatTile(icon: "checkmark.seal.fill", tint: Theme.emerald, label: "Contrats actifs", value: "\(m?.activeContracts ?? 0)")
                StatTile(icon: "person.2.fill", tint: Theme.violet, label: "Clients", value: "\(m?.totalClients ?? 0)")
            }

            SummaryCard(rows: [
                ("Offres \(String(store.year))", "\(t.offers)"),
                ("Contrats \(String(store.year))", "\(t.contracts)"),
                ("Taux de conversion", conversionRate),
            ])
        }
    }

    private var conversionRate: String {
        let t = store.totals
        guard t.offers > 0 else { return "—" }
        return String(format: "%.1f %%", Double(t.contracts) / Double(t.offers) * 100)
    }
}

// MARK: - Composants

/// Bloc de tête : le chiffre qu'on regarde en premier.
struct HighlightCard: View {
    let label: String
    let value: String
    var tint: Color = Theme.primary

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(.white.opacity(0.85))

            Text(value)
                .font(.system(size: 34, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
                .contentTransition(.numericText())
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(22)
        .background(
            RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                .fill(Theme.gradient(tint))
        )
    }
}

/// Évolution mensuelle du chiffre d'affaires — Swift Charts, impossible à
/// rendre aussi finement dans une WebView.
struct RevenueChart: View {
    let months: [MonthlyFinancialData]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Évolution mensuelle")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Theme.foreground)

            Chart(months) { m in
                BarMark(
                    x: .value("Mois", m.shortLabel),
                    y: .value("CA", m.totalRevenue)
                )
                .foregroundStyle(Theme.primary.gradient)
                .cornerRadius(5)
            }
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisGridLine().foregroundStyle(Theme.border)
                    AxisValueLabel {
                        if let v = value.as(Double.self) {
                            Text(compact(v))
                                .font(.system(size: 10))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }
                }
            }
            .chartXAxis {
                AxisMarks { value in
                    AxisValueLabel {
                        if let s = value.as(String.self) {
                            Text(s)
                                .font(.system(size: 10))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }
                }
            }
            .frame(height: 190)
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                .fill(Theme.surface)
        )
    }

    /// Axe lisible : 120 k plutôt que 120 000.
    private func compact(_ v: Double) -> String {
        if v >= 1_000_000 { return String(format: "%.1f M", v / 1_000_000) }
        if v >= 1_000 { return "\(Int(v / 1_000)) k" }
        return "\(Int(v))"
    }
}

struct SummaryCard: View {
    let rows: [(String, String)]

    var body: some View {
        VStack(spacing: 0) {
            ForEach(Array(rows.enumerated()), id: \.offset) { index, row in
                HStack {
                    Text(row.0)
                        .font(.system(size: 15))
                        .foregroundStyle(Theme.mutedForeground)
                    Spacer()
                    Text(row.1)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                }
                .padding(.vertical, 13)

                if index < rows.count - 1 {
                    Divider().overlay(Theme.border)
                }
            }
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 4)
        .background(
            RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                .fill(Theme.surface)
        )
    }
}

struct StatTile: View {
    let icon: String
    var tint: Color = Theme.primary
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 34, height: 34)
                .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(tint))

            Spacer(minLength: 0)

            Text(value)
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundStyle(Theme.foreground)
                .minimumScaleFactor(0.6)
                .lineLimit(1)

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

/// Prévisionnel : les dossiers engagés mais pas encore réalisés.
struct ForecastCard: View {
    let stats: ContractStatistics

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 8) {
                Image(systemName: "chart.bar.doc.horizontal")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Theme.primary)
                Text("Prévisionnel")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Theme.foreground)
                Spacer()
                Text("\(stats.count) dossier(s)")
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.mutedForeground)
            }
            .padding(.bottom, 6)

            DetailRow(label: "Chiffre d'affaires", value: Format.currency(stats.totalRevenue))
            Divider().overlay(Theme.border)
            DetailRow(label: "Achats", value: Format.currency(stats.totalPurchases))
            Divider().overlay(Theme.border)
            DetailRow(label: "Marge", value: Format.currency(stats.totalMargin), emphasis: true)
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                .fill(Theme.surface)
        )
    }
}
