import Foundation
import SwiftUI
import Supabase

// MARK: - Point mort

/// Rentabilité du contrat : combien de mois pour rembourser le matériel, et où
/// l'on en est. Formules reprises de `ContractBreakevenCard`.
struct ContractBreakevenCard: View {

    let contract: ContractDetail
    let equipmentCost: Double

    private var monthly: Double { contract.monthlyPayment }
    private var duration: Int { contract.duration }

    /// Nombre de mensualités nécessaires pour couvrir le coût du matériel.
    private var breakevenMonths: Int {
        monthly > 0 ? Int(ceil(equipmentCost / monthly)) : duration
    }

    private var monthsElapsed: Int {
        guard let start = contract.contractStartDate else { return 0 }
        let months = Calendar.current.dateComponents([.month], from: start, to: Date()).month ?? 0
        return max(0, months)
    }

    private var isProfitable: Bool { monthsElapsed >= breakevenMonths }
    private var progress: Double {
        guard breakevenMonths > 0 else { return 1 }
        return min(1, Double(monthsElapsed) / Double(breakevenMonths))
    }

    private var totalRevenue: Double { monthly * Double(duration) }
    private var totalMargin: Double { totalRevenue - equipmentCost }
    private var monthlyAmortization: Double {
        duration > 0 ? equipmentCost / Double(duration) : 0
    }
    private var marginAfterAmortization: Double { monthly - monthlyAmortization }
    private var netProfitSoFar: Double {
        Double(max(0, monthsElapsed - breakevenMonths)) * monthly
    }

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 8) {
                    Image(systemName: isProfitable ? "checkmark.seal.fill" : "hourglass")
                        .font(.system(size: 15))
                        .foregroundStyle(isProfitable ? Theme.emerald : Theme.amber)
                    Text("Point mort")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                    Spacer()
                    Text(isProfitable ? "Rentable" : "En cours d'amortissement")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(isProfitable ? Theme.emerald : Theme.amber)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 4)
                        .background(
                            Capsule().fill((isProfitable ? Theme.emerald : Theme.amber).opacity(0.15))
                        )
                }

                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("\(monthsElapsed) / \(breakevenMonths) mois")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Theme.foreground)
                        Spacer()
                        Text("\(Int(progress * 100)) %")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Theme.mutedForeground)
                    }
                    ProgressView(value: progress)
                        .tint(isProfitable ? Theme.emerald : Theme.amber)
                }

                VStack(spacing: 0) {
                    DetailRow(label: "Coût du matériel", value: Format.currency(equipmentCost))
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Revenu sur \(duration) mois", value: Format.currency(totalRevenue))
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Marge totale", value: Format.currency(totalMargin), emphasis: true)
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Amortissement mensuel", value: Format.currency(monthlyAmortization))
                    Divider().overlay(Theme.border)
                    DetailRow(
                        label: "Marge après amortissement",
                        value: Format.currency(marginAfterAmortization)
                    )
                    if isProfitable, netProfitSoFar > 0 {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Bénéfice depuis le point mort", value: Format.currency(netProfitSoFar))
                    }
                }

                if equipmentCost == 0 {
                    Text("Aucun coût de matériel connu : renseignez les prix fournisseurs dans l'onglet Achats.")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                }
            }
        }
    }
}

// MARK: - Mandat SEPA

/// Mandat de prélèvement Mollie du contrat, en lecture avec relance du client.
struct ContractSepaCard: View {

    let contract: ContractDetail
    let onChanged: () async -> Void

    @State private var isWorking = false
    @State private var message: String?
    @State private var errorMessage: String?

    private var statusTint: Color {
        switch contract.mollieMandateStatus {
        case "valid":   return Theme.emerald
        case "pending": return Theme.amber
        case "invalid": return Theme.destructive
        default:        return Theme.mutedForeground
        }
    }

    private var statusLabel: String {
        switch contract.mollieMandateStatus {
        case "valid":   return "Mandat valide"
        case "pending": return "En attente de signature"
        case "invalid": return "Mandat invalide"
        case nil:       return "Aucun mandat"
        default:        return contract.mollieMandateStatus?.capitalized ?? "—"
        }
    }

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    Image(systemName: "creditcard.fill")
                        .font(.system(size: 15))
                        .foregroundStyle(statusTint)
                    Text("Prélèvement SEPA")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                    Spacer()
                    Text(statusLabel)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(statusTint)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 4)
                        .background(Capsule().fill(statusTint.opacity(0.15)))
                }

                if let errorMessage { ErrorBanner(message: errorMessage) }
                if let message { InfoBanner(message: message) }

                if contract.hasMandate {
                    VStack(spacing: 0) {
                        DetailRow(label: "Client Mollie", value: contract.mollieCustomerId ?? "—")
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Mandat", value: contract.mollieMandateId ?? "—")
                        if let subscription = contract.mollieSubscriptionId {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Abonnement", value: subscription)
                        }
                    }
                } else {
                    Text("Aucun mandat de prélèvement n'est en place pour ce contrat. Le client doit le signer depuis son espace.")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.mutedForeground)

                    // Le mandat se signe chez Mollie : l'app ne peut que
                    // renvoyer l'invitation, jamais le créer à la place du client.
                    ActionButton(
                        title: "Renvoyer l'invitation SEPA",
                        icon: "envelope.fill",
                        tint: Theme.primary
                    ) {
                        Task { await resendInvitation() }
                    }
                    .disabled(isWorking)
                }
            }
        }
    }

    private func resendInvitation() async {
        isWorking = true
        defer { isWorking = false }
        errorMessage = nil

        struct Response: Decodable {
            let success: Bool?
            let error: String?
        }

        do {
            let response: Response = try await Backend.client.functions.invoke(
                "send-manual-followup-email",
                options: FunctionInvokeOptions(body: [
                    "contractId": AnyJSON.string(contract.id),
                    "to": contract.clientEmail.map(AnyJSON.string) ?? .null,
                    "subject": .string("Mise en place de votre prélèvement SEPA"),
                    "html": .string(
                        "<p>Bonjour,</p><p>Pour finaliser votre contrat, il reste à signer le mandat de prélèvement SEPA depuis votre espace client.</p><p>Bien à vous,</p>"
                    ),
                ])
            )
            if response.success == true {
                message = "Invitation renvoyée au client."
                await onChanged()
            } else {
                errorMessage = response.error ?? "Envoi impossible."
            }
        } catch {
            errorMessage = "Envoi impossible."
        }
    }
}

// MARK: - Frais

/// Frais de dossier et d'assurance prélevés par la société, distincts du loyer.
struct ContractFeesCard: View {

    let contract: ContractDetail
    let onChanged: () async -> Void

    @State private var isEditing = false

    private var dossierTint: Color {
        contract.dossierFeeStatus == "paid" ? Theme.emerald : Theme.amber
    }

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    Image(systemName: "eurosign.circle.fill")
                        .font(.system(size: 15))
                        .foregroundStyle(Theme.teal)
                    Text("Frais")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                    Spacer()
                }

                VStack(spacing: 0) {
                    DetailRow(
                        label: "Frais de dossier",
                        value: contract.dossierFeeAmount.map(Format.currency) ?? "—"
                    )
                    if contract.dossierFeeAmount != nil {
                        Divider().overlay(Theme.border)
                        HStack {
                            Text("Statut")
                                .font(.system(size: 15))
                                .foregroundStyle(Theme.mutedForeground)
                            Spacer()
                            Text(contract.dossierFeeStatus == "paid" ? "Payés" : "En attente")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(dossierTint)
                        }
                        .padding(.vertical, 12)
                    }
                    Divider().overlay(Theme.border)
                    DetailRow(
                        label: "Assurance mensuelle",
                        value: contract.insuranceFeeAmount.map(Format.currency) ?? "—"
                    )
                    if contract.insuranceFeeActive == true {
                        Divider().overlay(Theme.border)
                        HStack {
                            Text("Assurance")
                                .font(.system(size: 15))
                                .foregroundStyle(Theme.mutedForeground)
                            Spacer()
                            Text("Active")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Theme.emerald)
                        }
                        .padding(.vertical, 12)
                    }
                }

                ActionButton(title: "Modifier les frais", icon: "square.and.pencil", tint: Theme.primary) {
                    isEditing = true
                }
            }
        }
        .sheet(isPresented: $isEditing) {
            ContractFeesSheet(contract: contract) { await onChanged() }
        }
    }
}

struct ContractFeesSheet: View {

    @Environment(\.dismiss) private var dismiss

    let contract: ContractDetail
    let onSaved: () async -> Void

    @State private var dossierFee = ""
    @State private var dossierPaid = false
    @State private var insuranceFee = ""
    @State private var insuranceActive = false
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    if let errorMessage { ErrorBanner(message: errorMessage) }

                    FormSection(title: "Frais de dossier (€)") {
                        LeazrField(
                            icon: "doc.text",
                            placeholder: "0",
                            text: $dossierFee,
                            keyboardType: .decimalPad
                        )
                    }

                    Toggle("Frais de dossier payés", isOn: $dossierPaid)
                        .tint(Theme.primary)
                        .font(.system(size: 15))
                        .padding(.horizontal, 16)
                        .frame(height: 52)
                        .background(
                            RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                .fill(Theme.surface)
                        )

                    FormSection(title: "Assurance mensuelle (€)") {
                        LeazrField(
                            icon: "shield",
                            placeholder: "0",
                            text: $insuranceFee,
                            keyboardType: .decimalPad
                        )
                    }

                    Toggle("Assurance active", isOn: $insuranceActive)
                        .tint(Theme.primary)
                        .font(.system(size: 15))
                        .padding(.horizontal, 16)
                        .frame(height: 52)
                        .background(
                            RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                .fill(Theme.surface)
                        )

                    PrimaryButton(
                        title: "Enregistrer",
                        systemImage: "checkmark.circle.fill",
                        isLoading: isSaving
                    ) {
                        Task { await save() }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Frais du contrat")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .onAppear {
                if let value = contract.dossierFeeAmount { dossierFee = String(format: "%.2f", value) }
                dossierPaid = contract.dossierFeeStatus == "paid"
                if let value = contract.insuranceFeeAmount { insuranceFee = String(format: "%.2f", value) }
                insuranceActive = contract.insuranceFeeActive ?? false
            }
        }
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        func amount(_ text: String) -> AnyJSON {
            guard let value = Double(text.replacingOccurrences(of: ",", with: ".")) else { return .null }
            return .double(value)
        }

        let ok = await ContractService.patch(contractId: contract.id, [
            "dossier_fee_amount": amount(dossierFee),
            "dossier_fee_status": .string(dossierPaid ? "paid" : "pending"),
            "insurance_fee_amount": amount(insuranceFee),
            "insurance_fee_active": .bool(insuranceActive),
        ])

        if ok {
            await onSaved()
            dismiss()
        } else {
            errorMessage = "Enregistrement impossible."
        }
    }
}

// MARK: - Assurance Tulip

struct ContractTulipCard: View {

    let contract: ContractDetail

    private var tint: Color { contract.isInsured ? Theme.emerald : Theme.mutedForeground }

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    Image(systemName: "shield.lefthalf.filled")
                        .font(.system(size: 15))
                        .foregroundStyle(tint)
                    Text("Assurance Tulip")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                    Spacer()
                    Text(contract.isInsured ? "Souscrite" : "Non souscrite")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(tint)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 4)
                        .background(Capsule().fill(tint.opacity(0.15)))
                }

                if contract.isInsured {
                    VStack(spacing: 0) {
                        DetailRow(label: "Référence", value: contract.tulipContractId ?? "—")
                        if let status = contract.tulipStatus {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Statut", value: status.capitalized)
                        }
                        if let date = contract.tulipSubscribedAt {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Souscrite le", value: Format.date(date))
                        }
                    }
                } else {
                    // La souscription se fait chez Tulip, avec des données que
                    // l'app n'a pas : on affiche l'état, on ne souscrit pas.
                    Text("Aucune assurance Tulip sur ce contrat. La souscription se fait depuis le web.")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.mutedForeground)
                }
            }
        }
    }
}
