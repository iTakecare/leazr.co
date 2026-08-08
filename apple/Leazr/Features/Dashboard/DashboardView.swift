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
                MonthlyBreakdown(months: store.months)
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

/// Détail mois par mois : CA, achats, marge et taux.
///
/// Le graphique donne la tendance, ce tableau donne les chiffres. Les deux
/// sont complémentaires — on regarde la courbe, puis on vérifie la ligne.
struct MonthlyBreakdown: View {
    let months: [MonthlyFinancialData]

    /// On masque les mois sans aucune activité : ils allongent le tableau
    /// sans rien apprendre.
    private var active: [MonthlyFinancialData] {
        months.filter { $0.totalRevenue > 0 || $0.purchases > 0 }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Détail mensuel")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Theme.foreground)
                .padding(.bottom, 14)

            HStack {
                Text("Mois").frame(width: 44, alignment: .leading)
                Text("CA").frame(maxWidth: .infinity, alignment: .trailing)
                Text("Achats").frame(maxWidth: .infinity, alignment: .trailing)
                Text("Marge").frame(maxWidth: .infinity, alignment: .trailing)
            }
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(Theme.mutedForeground)
            .padding(.bottom, 8)

            ForEach(active) { m in
                let margin = m.totalRevenue - m.purchases
                let rate = m.totalRevenue > 0 ? margin / m.totalRevenue * 100 : 0

                VStack(spacing: 4) {
                    HStack {
                        Text(m.monthName.prefix(3).capitalized)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Theme.foreground)
                            .frame(width: 44, alignment: .leading)

                        Text(compact(m.totalRevenue))
                            .frame(maxWidth: .infinity, alignment: .trailing)
                            .foregroundStyle(Theme.foreground)

                        Text(compact(m.purchases))
                            .frame(maxWidth: .infinity, alignment: .trailing)
                            .foregroundStyle(Theme.mutedForeground)

                        Text(compact(margin))
                            .frame(maxWidth: .infinity, alignment: .trailing)
                            .foregroundStyle(margin >= 0 ? Theme.emerald : Theme.destructive)
                    }
                    .font(.system(size: 13, weight: .medium))

                    HStack(spacing: 10) {
                        Text("\(m.contractsCount) contrat(s) · \(m.offersCount) offre(s)")
                            .font(.system(size: 11))
                            .foregroundStyle(Theme.mutedForeground)
                        Spacer()
                        Text(String(format: "%.0f %% de marge", rate))
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(Theme.mutedForeground)
                    }
                }
                .padding(.vertical, 9)

                if m.id != active.last?.id {
                    Divider().overlay(Theme.border)
                }
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                .fill(Theme.surface)
        )
    }

    private func compact(_ v: Double) -> String {
        if abs(v) >= 1_000_000 { return String(format: "%.1fM", v / 1_000_000) }
        if abs(v) >= 1_000 { return String(format: "%.0fk", v / 1_000) }
        return String(format: "%.0f", v)
    }
}

/// Évolution mensuelle : chiffre d'affaires, achats et marge.
///
/// Trois séries plutôt qu'une : la marge ne se lit pas sur une barre de CA
/// isolée, c'est l'écart avec les achats qui la donne. La légende et les
/// valeurs au-dessus des barres évitent d'avoir à deviner l'échelle.
struct RevenueChart: View {

    let months: [MonthlyFinancialData]
    @State private var selected: MonthlyFinancialData?

    private enum Series: String, CaseIterable, Plottable {
        case revenue = "Chiffre d'affaires"
        case purchases = "Achats"
        case margin = "Marge"

        var color: Color {
            switch self {
            case .revenue:   return Theme.primary
            case .purchases: return Theme.amber
            case .margin:    return Theme.emerald
            }
        }
    }

    /// On ne trace que les mois ayant une activité : douze barres dont huit
    /// vides écrasent l'échelle et n'apprennent rien.
    private var active: [MonthlyFinancialData] {
        months.filter { $0.totalRevenue > 0 || $0.purchases > 0 }
    }

    private func value(_ m: MonthlyFinancialData, _ s: Series) -> Double {
        switch s {
        case .revenue:   return m.totalRevenue
        case .purchases: return m.purchases
        case .margin:    return m.margin
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            header

            if active.isEmpty {
                EmptyHint(icon: "chart.bar", label: "Aucune donnée sur l'année")
            } else {
                chart
                legend
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                .fill(Theme.surface)
        )
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Évolution mensuelle")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Theme.foreground)

            Text(selected.map { "\($0.shortLabel) · \(Format.currency($0.totalRevenue)) de CA" }
                 ?? "Touchez une barre pour le détail")
                .font(.system(size: 13))
                .foregroundStyle(selected == nil ? Theme.mutedForeground : Theme.primary)
                .animation(.easeOut(duration: 0.15), value: selected?.id)
        }
    }

    private var chart: some View {
        // Défilement horizontal : sur douze mois et trois séries, comprimer
        // dans la largeur de l'écran rendrait les barres illisibles.
        ScrollView(.horizontal, showsIndicators: false) {
            Chart {
                ForEach(active) { m in
                    ForEach(Series.allCases, id: \.self) { s in
                        BarMark(
                            x: .value("Mois", m.shortLabel),
                            y: .value("Montant", value(m, s))
                        )
                        .foregroundStyle(by: .value("Série", s.rawValue))
                        .position(by: .value("Série", s.rawValue))
                        .cornerRadius(4)
                        .opacity(selected == nil || selected?.id == m.id ? 1 : 0.35)
                    }

                    // Étiquette de CA au-dessus du groupe : la valeur exacte
                    // sans avoir à viser l'axe.
                    if let first = Series.allCases.first {
                        RuleMark(x: .value("Mois", m.shortLabel))
                            .opacity(0)
                            .annotation(position: .top, alignment: .center) {
                                Text(compact(value(m, first)))
                                    .font(.system(size: 10, weight: .semibold))
                                    .foregroundStyle(Theme.mutedForeground)
                            }
                    }
                }
            }
            .chartForegroundStyleScale([
                Series.revenue.rawValue: Series.revenue.color,
                Series.purchases.rawValue: Series.purchases.color,
                Series.margin.rawValue: Series.margin.color,
            ])
            .chartLegend(.hidden)
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisGridLine().foregroundStyle(Theme.border.opacity(0.6))
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
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }
                }
            }
            .chartOverlay { proxy in
                GeometryReader { geo in
                    Rectangle().fill(.clear).contentShape(Rectangle())
                        .onTapGesture { location in
                            guard let plot = proxy.plotFrame else { return }
                            let x = location.x - geo[plot].origin.x
                            guard let label: String = proxy.value(atX: x) else { return }
                            let hit = active.first { $0.shortLabel == label }
                            withAnimation(.easeOut(duration: 0.15)) {
                                selected = (selected?.id == hit?.id) ? nil : hit
                            }
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        }
                }
            }
            .frame(width: max(340, CGFloat(active.count) * 78), height: 230)
            .padding(.top, 14)
        }
    }

    private var legend: some View {
        HStack(spacing: 16) {
            ForEach(Series.allCases, id: \.self) { s in
                HStack(spacing: 6) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(s.color)
                        .frame(width: 11, height: 11)
                    Text(s.rawValue)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Theme.mutedForeground)
                }
            }
            Spacer(minLength: 0)
        }
    }

    /// Échelle lisible : 120 k plutôt que 120 000.
    private func compact(_ v: Double) -> String {
        if abs(v) >= 1_000_000 { return String(format: "%.1f M", v / 1_000_000) }
        if abs(v) >= 1_000 { return String(format: "%.0f k", v / 1_000) }
        return String(format: "%.0f", v)
    }
}
