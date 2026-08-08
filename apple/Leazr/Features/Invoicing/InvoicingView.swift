import Foundation
import Observation
import SwiftUI
import Supabase

@MainActor
@Observable
final class InvoicingStore {

    private(set) var invoices: [InvoiceDetail] = []
    private(set) var creditNotes: [CreditNote] = []
    private(set) var report: [FiscalYearReport] = []
    private(set) var billit = InvoiceService.BillitState(isEnabled: false)
    private(set) var isLoading = false
    var errorMessage: String?
    var infoMessage: String?

    var search = ""
    var tab: InvoiceTab = .all
    var sort: InvoiceSort = .dateDescending
    var dateFrom: Date?
    var dateTo: Date?
    var overdueOnly = false

    private(set) var companyId: String?

    func load() async {
        isLoading = true
        defer { isLoading = false }

        guard let companyId = await Session.shared.resolve() else {
            errorMessage = "Société introuvable."
            return
        }
        self.companyId = companyId

        async let invoicesTask = InvoiceService.invoices(companyId: companyId)
        async let creditsTask = InvoiceService.creditNotes(companyId: companyId)
        async let reportTask = InvoiceService.accountingReport(companyId: companyId)
        async let billitTask = InvoiceService.billitIntegration(companyId: companyId)

        invoices = await invoicesTask
        creditNotes = await creditsTask
        report = await reportTask
        billit = await billitTask
        errorMessage = nil
    }

    func count(for tab: InvoiceTab) -> Int {
        invoices.filter { tab.matches($0) }.count
    }

    var filtered: [InvoiceDetail] {
        var result = invoices.filter { tab.matches($0) }

        if overdueOnly {
            result = result.filter(\.isOverdue)
        }
        if let dateFrom {
            result = result.filter { ($0.invoiceDate ?? $0.createdAt ?? .distantPast) >= dateFrom }
        }
        if let dateTo {
            result = result.filter { ($0.invoiceDate ?? $0.createdAt ?? .distantFuture) <= dateTo }
        }

        if !search.isEmpty {
            let q = search.lowercased()
            result = result.filter {
                ($0.invoiceNumber?.lowercased().contains(q) ?? false)
                    || $0.leaserName.lowercased().contains(q)
                    || $0.clientName.lowercased().contains(q)
                    || String(format: "%.0f", $0.amount).contains(q)
            }
        }

        return sort.sort(result)
    }

    /// Total facturé de la sélection, net des notes de crédit.
    var selectionTotal: Double {
        filtered.reduce(0) { $0 + $1.netAmount }
    }

    var overdueCount: Int { invoices.filter(\.isOverdue).count }

    var hasDateFilter: Bool { dateFrom != nil || dateTo != nil }

    func resetFilters() {
        dateFrom = nil
        dateTo = nil
        overdueOnly = false
        sort = .dateDescending
    }
}

// MARK: - Écran

struct InvoicesView: View {

    /// Poussé depuis « Plus » : la pile de navigation existe déjà.
    var embedded = false

    @State private var store = InvoicingStore()
    @State private var section: Section = .invoices
    @State private var isCreating = false
    @State private var isFiltering = false
    @State private var isImporting = false

    enum Section: String, CaseIterable, Identifiable {
        case invoices = "Factures"
        case creditNotes = "Notes de crédit"
        case report = "Rapport"

        var id: String { rawValue }

        var icon: String {
            switch self {
            case .invoices:    return "doc.text.fill"
            case .creditNotes: return "arrow.uturn.backward.circle"
            case .report:      return "chart.bar.doc.horizontal"
            }
        }
    }

    var body: some View {
        if embedded { content } else { NavigationStack { content } }
    }

    private var content: some View {
        VStack(spacing: 0) {
            sectionBar

            Group {
                switch section {
                case .invoices:    invoicesSection
                case .creditNotes: creditNotesSection
                case .report:      reportSection
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("Factures")
        .navigationBarTitleDisplayMode(embedded ? .inline : .large)
        .toolbar {
            if !embedded { ProfileMenu() }
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button { isCreating = true } label: {
                    Image(systemName: "plus.circle.fill").font(.system(size: 20))
                }
                Menu {
                    Picker("Tri", selection: Bindable(store).sort) {
                        ForEach(InvoiceSort.allCases) { option in
                            Text(option.title).tag(option)
                        }
                    }
                    Button { isFiltering = true } label: {
                        Label("Période", systemImage: "calendar")
                    }
                    if store.billit.isEnabled {
                        Button { isImporting = true } label: {
                            Label("Billit", systemImage: "arrow.triangle.2.circlepath")
                        }
                    }
                } label: {
                    Image(systemName: store.hasDateFilter
                        ? "line.3.horizontal.decrease.circle.fill"
                        : "ellipsis.circle")
                        .font(.system(size: 19))
                }
            }
        }
        .sheet(isPresented: $isCreating) {
            NewInvoiceSheet(companyId: store.companyId) { await store.load() }
        }
        .sheet(isPresented: $isFiltering) {
            InvoicePeriodSheet(store: store)
                .presentationDetents([.height(480)])
        }
        .sheet(isPresented: $isImporting) {
            BillitSheet(companyId: store.companyId) { await store.load() }
        }
        .searchable(text: Bindable(store).search, prompt: "N° de facture, client ou montant")
        .refreshable { await store.load() }
        .task { if store.invoices.isEmpty { await store.load() } }
    }

    private var sectionBar: some View {
        VStack(spacing: 10) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 7) {
                    ForEach(Section.allCases) { item in
                        let isActive = section == item
                        Button {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            withAnimation(.easeOut(duration: 0.16)) { section = item }
                        } label: {
                            HStack(spacing: 5) {
                                Image(systemName: item.icon).font(.system(size: 11, weight: .semibold))
                                Text(item.rawValue).font(.system(size: 13, weight: .semibold))
                            }
                            .foregroundStyle(isActive ? .white : Theme.mutedForeground)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Capsule().fill(isActive ? Theme.primary : Theme.surface))
                        }
                        .buttonStyle(PressableStyle())
                    }
                }
                .padding(.horizontal, 20)
            }

            if section == .invoices {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(InvoiceTab.allCases) { tab in
                            let count = store.count(for: tab)
                            if count > 0 || tab == .all {
                                StockChip(
                                    label: tab.title,
                                    count: count,
                                    tint: tab.tint,
                                    isSelected: store.tab == tab
                                ) { store.tab = tab }
                            }
                        }

                        // Les impayés échus sont la file de travail : un accès
                        // direct vaut mieux qu'un filtre enfoui dans un menu.
                        if store.overdueCount > 0 {
                            StockChip(
                                label: "En retard",
                                count: store.overdueCount,
                                tint: Theme.destructive,
                                isSelected: store.overdueOnly
                            ) { store.overdueOnly.toggle() }
                        }
                    }
                    .padding(.horizontal, 20)
                }

                if store.selectionTotal > 0 {
                    HStack {
                        Text("Total net")
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.mutedForeground)
                        Spacer()
                        Text(Format.currency(store.selectionTotal))
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(Theme.primary)
                    }
                    .padding(.horizontal, 20)
                }
            }
        }
        .padding(.vertical, 10)
    }

    // MARK: Factures

    @ViewBuilder
    private var invoicesSection: some View {
        if store.invoices.isEmpty && store.isLoading {
            ProgressView().tint(Theme.mutedForeground)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if store.filtered.isEmpty {
            VStack(spacing: 14) {
                if let error = store.errorMessage {
                    ErrorBanner(message: error).padding(.horizontal, 20)
                }
                EmptyHint(icon: "doc.text", label: "Aucune facture")
                if store.hasDateFilter || store.overdueOnly {
                    Button("Réinitialiser les filtres") { store.resetFilters() }
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Theme.primary)
                }
            }
        } else {
            ScrollView {
                LazyVStack(spacing: 10) {
                    if let info = store.infoMessage {
                        InfoBanner(message: info)
                    }

                    ForEach(store.filtered) { invoice in
                        NavigationLink {
                            InvoiceDetailScreen(invoiceId: invoice.id) { await store.load() }
                        } label: {
                            InvoiceRow(invoice: invoice)
                        }
                        .buttonStyle(PressableStyle())
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
        }
    }

    // MARK: Notes de crédit

    @ViewBuilder
    private var creditNotesSection: some View {
        if store.creditNotes.isEmpty {
            EmptyHint(icon: "arrow.uturn.backward.circle", label: "Aucune note de crédit")
        } else {
            ScrollView {
                LazyVStack(spacing: 10) {
                    ForEach(store.creditNotes) { note in
                        CreditNoteCard(note: note) { await store.load() }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
        }
    }

    // MARK: Rapport comptable

    @ViewBuilder
    private var reportSection: some View {
        if store.report.isEmpty {
            EmptyHint(icon: "chart.bar.doc.horizontal", label: "Aucune donnée comptable")
        } else {
            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(store.report) { year in
                        FiscalYearCard(report: year)
                    }

                    ShareLink(item: AccountingExport.write(store.report)) {
                        HStack(spacing: 7) {
                            Image(systemName: "square.and.arrow.up").font(.system(size: 14, weight: .semibold))
                            Text("Exporter le rapport (CSV)").font(.system(size: 16, weight: .medium))
                        }
                        .foregroundStyle(Theme.primary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
        }
    }
}

// MARK: - Ligne de liste

struct InvoiceRow: View {
    let invoice: InvoiceDetail

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(invoice.invoiceNumber ?? "Sans numéro")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Theme.foreground)
                            .lineLimit(1)
                        Text(invoice.clientName)
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.mutedForeground)
                            .lineLimit(1)
                    }

                    Spacer(minLength: 8)

                    VStack(alignment: .trailing, spacing: 5) {
                        Text(Format.currency(invoice.amount))
                            .font(.system(size: 17, weight: .bold))
                            .foregroundStyle(Theme.foreground)

                        HStack(spacing: 5) {
                            Image(systemName: InvoiceVocabulary.icon(invoice.status))
                                .font(.system(size: 10, weight: .bold))
                            Text(InvoiceVocabulary.label(invoice.status))
                                .font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundStyle(InvoiceVocabulary.tint(invoice.status))
                        .padding(.horizontal, 9)
                        .padding(.vertical, 4)
                        .background(
                            Capsule().fill(InvoiceVocabulary.tint(invoice.status).opacity(0.15))
                        )
                    }
                }

                Divider().overlay(Theme.border)

                HStack(spacing: 8) {
                    Text(Format.date(invoice.invoiceDate ?? invoice.createdAt))
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)

                    if invoice.isPurchase {
                        Text("· Vente directe")
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.teal)
                    }

                    Spacer(minLength: 0)

                    if invoice.isOverdue {
                        HStack(spacing: 4) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 9, weight: .bold))
                            Text("Échue le \(Format.date(invoice.dueDate))")
                                .font(.system(size: 11, weight: .semibold))
                        }
                        .foregroundStyle(Theme.destructive)
                    } else if invoice.creditedAmount > 0 {
                        Text("Créditée de \(Format.currency(invoice.creditedAmount))")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(Theme.violet)
                    }
                }
            }
        }
    }
}

// MARK: - Note de crédit

struct CreditNoteCard: View {
    let note: CreditNote
    let onChanged: () async -> Void

    @State private var isDeleting = false

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(note.creditNoteNumber ?? "Sans numéro")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Theme.foreground)
                        if let invoice = note.invoice {
                            Text("Sur la facture \(invoice.invoiceNumber ?? "—")")
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }

                    Spacer(minLength: 8)

                    Text("− \(Format.currency(note.amount))")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(Theme.violet)
                }

                if let reason = note.reason, !reason.isEmpty {
                    Text(reason)
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.mutedForeground)
                }

                HStack {
                    Text(Format.date(note.issuedAt))
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                    Spacer()
                    Button(role: .destructive) { isDeleting = true } label: {
                        Image(systemName: "trash")
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.destructive)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .alert("Supprimer cette note de crédit ?", isPresented: $isDeleting) {
            Button("Annuler", role: .cancel) {}
            Button("Supprimer", role: .destructive) {
                Task {
                    if await InvoiceService.deleteCreditNote(note) { await onChanged() }
                }
            }
        } message: {
            Text("La facture repassera en « Envoyée » et son montant crédité sera remis à zéro.")
        }
    }
}

// MARK: - Rapport

struct FiscalYearCard: View {
    let report: FiscalYearReport

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text(String(report.year))
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(Theme.foreground)
                    Spacer()
                    Text(Format.currency(report.netRevenue))
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(Theme.primary)
                }

                Text("Chiffre net — factures moins notes de crédit émises cette année")
                    .font(.system(size: 11))
                    .foregroundStyle(Theme.mutedForeground)

                VStack(spacing: 0) {
                    DetailRow(
                        label: "Facturé (\(report.invoiceCount))",
                        value: Format.currency(report.invoiceTotal)
                    )
                    Divider().overlay(Theme.border)
                    DetailRow(
                        label: "Payé (\(report.paidCount))",
                        value: Format.currency(report.paid)
                    )
                    Divider().overlay(Theme.border)
                    DetailRow(
                        label: "Impayé (\(report.unpaidCount))",
                        value: Format.currency(report.unpaid)
                    )
                    if report.creditedCount > 0 {
                        Divider().overlay(Theme.border)
                        DetailRow(
                            label: "Crédité (\(report.creditedCount))",
                            value: Format.currency(report.credited)
                        )
                    }
                    if report.creditNoteCount > 0 {
                        Divider().overlay(Theme.border)
                        DetailRow(
                            label: "Notes de crédit (\(report.creditNoteCount))",
                            value: "− \(Format.currency(report.creditNoteTotal))"
                        )
                    }
                }
            }
        }
    }
}

/// Export du rapport comptable, une ligne par année.
enum AccountingExport {

    static func write(_ report: [FiscalYearReport]) -> URL {
        let headers = [
            "Année", "Factures", "Nombre", "Payé", "Nb payées", "Impayé",
            "Nb impayées", "Crédité", "Notes de crédit", "Chiffre net",
        ]
        var rows = [headers.joined(separator: ";")]

        for year in report {
            rows.append([
                String(year.year),
                number(year.invoiceTotal),
                String(year.invoiceCount),
                number(year.paid),
                String(year.paidCount),
                number(year.unpaid),
                String(year.unpaidCount),
                number(year.credited),
                number(year.creditNoteTotal),
                number(year.netRevenue),
            ].joined(separator: ";"))
        }

        // BOM UTF-8 : sans lui, Excel sur Windows massacre les accents.
        let content = "\u{FEFF}" + rows.joined(separator: "\r\n")
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("Rapport_comptable.csv")
        try? content.write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    private static func number(_ value: Double) -> String {
        String(format: "%.2f", value).replacingOccurrences(of: ".", with: ",")
    }
}
