import Foundation
import Observation
import SwiftUI
import Supabase

@MainActor
@Observable
final class ContractStore {

    private(set) var contract: ContractDetail?
    private(set) var equipment: [ContractEquipment] = []
    private(set) var documents: [ContractDocument] = []
    private(set) var logs: [ContractLog] = []
    private(set) var suppliers: [ContractService.Supplier] = []
    private(set) var startRule: ContractStartRule = .nextMonthFirst
    private(set) var isLoading = false
    var errorMessage: String?
    var infoMessage: String?

    func load(contractId: String) async {
        isLoading = true
        defer { isLoading = false }

        let rows: [ContractDetail] = (try? await Backend.client
            .from("contracts")
            .select(ContractDetail.columns)
            .eq("id", value: contractId)
            .limit(1)
            .execute().value) ?? []
        contract = rows.first

        async let equipmentTask = ContractService.equipment(contractId: contractId)
        async let documentsTask = ContractService.documents(contractId: contractId)
        async let logsTask = ContractService.logs(contractId: contractId)

        equipment = await equipmentTask
        documents = await documentsTask
        logs = await logsTask

        startRule = await ContractService.startRule(leaserId: contract?.leaserId)

        if let companyId = await Session.shared.resolve() {
            suppliers = await ContractService.suppliers(companyId: companyId)
        }
    }

    /// Coût réel de l'équipement : le prix effectivement payé au fournisseur
    /// prime sur le prix d'achat prévisionnel — c'est lui qui fait la marge.
    var equipmentCost: Double {
        equipment.reduce(0) { total, item in
            let unit = item.actualPurchasePrice ?? item.supplierPrice ?? item.purchasePrice
            return total + unit * Double(item.quantity)
        }
    }

    func supplierName(_ id: String?) -> String? {
        guard let id else { return nil }
        return suppliers.first { $0.id == id }?.name
    }
}

// MARK: - Écran

struct ContractDetailView: View {

    let contract: Contract

    @State private var store = ContractStore()
    @State private var section: Section = .summary
    @State private var isChangingStatus = false
    @State private var targetStep: ContractWorkflow.Step?
    @State private var isEditingTracking = false
    @State private var isEditingDates = false
    @State private var isEditingMeta = false
    @State private var isSendingFollowUp = false

    enum Section: String, CaseIterable, Identifiable {
        case summary = "Résumé"
        case equipment = "Équipements"
        case orders = "Achats"
        case finance = "Finance"
        case documents = "Documents"
        case history = "Historique"

        var id: String { rawValue }

        var icon: String {
            switch self {
            case .summary:   return "doc.text"
            case .equipment: return "laptopcomputer"
            case .orders:    return "shippingbox"
            case .finance:   return "eurosign.circle"
            case .documents: return "paperclip"
            case .history:   return "clock.arrow.circlepath"
            }
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let error = store.errorMessage {
                    ErrorBanner(message: error)
                }
                if let info = store.infoMessage {
                    InfoBanner(message: info)
                }

                HighlightCard(
                    label: "Mensualité",
                    value: Format.currency(store.contract?.monthlyPayment ?? contract.monthlyPayment),
                    tint: ContractWorkflow.tint(store.contract?.status ?? contract.status)
                )

                sectionBar

                switch section {
                case .summary:   summarySection
                case .equipment: equipmentSection
                case .orders:    ordersSection
                case .finance:   financeSection
                case .documents: documentsSection
                case .history:   historySection
                }
            }
            .padding(20)
            .frame(maxWidth: 700)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle(contract.clientName)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button { isEditingMeta = true } label: {
                        Label("Référence et dispositions", systemImage: "square.and.pencil")
                    }
                    Button { isEditingDates = true } label: {
                        Label("Dates du contrat", systemImage: "calendar")
                    }
                    Button { isEditingTracking = true } label: {
                        Label("Suivi de livraison", systemImage: "shippingbox")
                    }
                    Button { isSendingFollowUp = true } label: {
                        Label("Envoyer un suivi", systemImage: "envelope")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle").font(.system(size: 19))
                }
            }
        }
        .sheet(item: $targetStep) { step in
            ContractStatusChangeSheet(
                step: step,
                current: store.contract?.status ?? contract.status
            ) { reason in
                let ok = await ContractService.updateStatus(
                    contractId: contract.id,
                    to: step.id,
                    from: store.contract?.status ?? contract.status,
                    reason: reason
                )
                if ok {
                    await store.load(contractId: contract.id)
                    store.infoMessage = "Contrat passé à « \(step.label) »."
                }
                return ok
            }
        }
        .sheet(isPresented: $isEditingTracking) {
            if let detail = store.contract {
                TrackingSheet(contract: detail) { await store.load(contractId: contract.id) }
            }
        }
        .sheet(isPresented: $isEditingDates) {
            if let detail = store.contract {
                ContractDatesSheet(contract: detail, rule: store.startRule) {
                    await store.load(contractId: contract.id)
                }
            }
        }
        .sheet(isPresented: $isEditingMeta) {
            if let detail = store.contract {
                ContractMetaSheet(contract: detail) { await store.load(contractId: contract.id) }
            }
        }
        .sheet(isPresented: $isSendingFollowUp) {
            if let detail = store.contract {
                ContractFollowUpSheet(contract: detail)
            }
        }
        .task { await store.load(contractId: contract.id) }
        .refreshable { await store.load(contractId: contract.id) }
    }

    private var sectionBar: some View {
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
            .padding(.horizontal, 2)
        }
    }

    // MARK: Résumé

    @ViewBuilder
    private var summarySection: some View {
        if let detail = store.contract {
            ContractWorkflowPanel(contract: detail) { step in
                targetStep = step
            }

            SignatureProgressTimeline(contract: detail)

            Card {
                VStack(spacing: 0) {
                    DetailRow(label: "Client", value: detail.clientName)
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Bailleur", value: detail.leaserName)
                    if let number = detail.contractNumber {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "N° de contrat", value: number)
                    }
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Durée", value: "\(detail.duration) mois")
                    if let financed = detail.financedAmount, financed > 0 {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Montant financé", value: Format.currency(financed))
                    }
                    if detail.isSelfLeasing {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Type", value: "Auto-leasing")
                    }
                }
            }

            ContractDatesCard(contract: detail, rule: store.startRule)

            if let tracking = detail.trackingNumber, !tracking.isEmpty {
                Card {
                    VStack(spacing: 0) {
                        DetailRow(label: "N° de suivi", value: tracking)
                        if let carrier = detail.deliveryCarrier, !carrier.isEmpty {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Transporteur", value: carrier)
                        }
                        if let estimated = detail.estimatedDelivery {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Livraison estimée", value: Format.date(estimated))
                        }
                    }
                }
            }

            if let provisions = detail.specialProvisions, !provisions.isEmpty {
                Card {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Dispositions particulières")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Theme.foreground)
                        Text(provisions)
                            .font(.system(size: 14))
                            .foregroundStyle(Theme.mutedForeground)
                    }
                }
            }

            ContractTerminationCard(contract: detail) { await store.load(contractId: contract.id) }
        } else if store.isLoading {
            ProgressView().tint(Theme.mutedForeground).padding(.top, 40)
        }
    }

    // MARK: Équipements

    private var equipmentSection: some View {
        VStack(spacing: 12) {
            if store.equipment.isEmpty {
                EquipmentSection(raw: contract.equipmentDescription)
                if store.equipment.isEmpty {
                    EmptyHint(icon: "laptopcomputer", label: "Aucun équipement détaillé")
                }
            }

            ForEach(store.equipment) { item in
                ContractEquipmentCard(
                    item: item,
                    companyId: store.contract?.clientId,
                    contractId: contract.id,
                    onChanged: { await store.load(contractId: contract.id) }
                )
            }
        }
    }

    // MARK: Achats

    private var ordersSection: some View {
        VStack(spacing: 12) {
            if store.equipment.isEmpty {
                EmptyHint(icon: "shippingbox", label: "Aucune ligne à commander")
            }

            ForEach(store.equipment) { item in
                PurchaseTrackingCard(
                    item: item,
                    suppliers: store.suppliers,
                    supplierName: store.supplierName(item.supplierId)
                ) { await store.load(contractId: contract.id) }
            }
        }
    }

    // MARK: Finance

    @ViewBuilder
    private var financeSection: some View {
        if let detail = store.contract {
            ContractBreakevenCard(contract: detail, equipmentCost: store.equipmentCost)
            ContractSepaCard(contract: detail) { await store.load(contractId: contract.id) }
            ContractFeesCard(contract: detail) { await store.load(contractId: contract.id) }
            ContractTulipCard(contract: detail)
        }
    }

    // MARK: Documents

    private var documentsSection: some View {
        VStack(spacing: 12) {
            if store.documents.isEmpty {
                EmptyHint(icon: "paperclip", label: "Aucun document")
            }

            ForEach(store.documents) { document in
                Card {
                    HStack(spacing: 12) {
                        Image(systemName: "doc.fill")
                            .font(.system(size: 17))
                            .foregroundStyle(Theme.sky)

                        VStack(alignment: .leading, spacing: 3) {
                            Text(document.fileName)
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(Theme.foreground)
                                .lineLimit(2)
                            HStack(spacing: 6) {
                                Text(document.documentType.replacingOccurrences(of: "_", with: " ").capitalized)
                                    .font(.system(size: 12))
                                    .foregroundStyle(Theme.mutedForeground)
                                if !document.readableSize.isEmpty {
                                    Text("· \(document.readableSize)")
                                        .font(.system(size: 12))
                                        .foregroundStyle(Theme.mutedForeground)
                                }
                            }
                        }

                        Spacer(minLength: 4)

                        StatusBadge(label: document.status.capitalized, status: document.status)
                    }
                }
            }
        }
    }

    // MARK: Historique

    private var historySection: some View {
        VStack(spacing: 12) {
            if store.logs.isEmpty {
                EmptyHint(icon: "clock", label: "Aucun mouvement enregistré")
            }

            ForEach(store.logs) { entry in
                Card {
                    VStack(alignment: .leading, spacing: 7) {
                        HStack(spacing: 8) {
                            Image(systemName: "arrow.right.circle.fill")
                                .font(.system(size: 13))
                                .foregroundStyle(ContractWorkflow.tint(entry.newStatus ?? ""))

                            Text(ContractWorkflow.label(entry.newStatus ?? ""))
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(Theme.foreground)

                            Spacer()

                            Text(Format.dateTime(entry.createdAt))
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.mutedForeground)
                        }

                        if let previous = entry.previousStatus, previous != entry.newStatus {
                            Text("Depuis « \(ContractWorkflow.label(previous)) »")
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.mutedForeground)
                        }

                        if let reason = entry.reason, !reason.isEmpty {
                            Text(reason)
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.mutedForeground)
                        }

                        if let user = entry.userName, !user.isEmpty {
                            Text(user)
                                .font(.system(size: 11))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }
                }
            }
        }
    }
}
