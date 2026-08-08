import Foundation
import Observation
import SwiftUI
import Supabase

/// Création d'une demande, en trois étapes comme le formulaire web :
/// client, équipements, conditions financières.
///
/// Le découpage n'est pas cosmétique : sur un téléphone, un formulaire de
/// quinze champs d'un seul tenant décourage la saisie. Trois écrans courts
/// avec une barre de progression se remplissent debout, entre deux rendez-vous.
struct CreateOfferView: View {

    @Environment(\.dismiss) private var dismiss
    @State private var model = NewOfferModel()
    @State private var step: Step = .client
    @State private var isPickingProduct = false

    var onCreated: () -> Void = {}

    enum Step: Int, CaseIterable {
        case client = 0, equipment, terms

        var title: String {
            switch self {
            case .client:    return "Client"
            case .equipment: return "Équipements"
            case .terms:     return "Conditions"
            }
        }

        var icon: String {
            switch self {
            case .client:    return "person.fill"
            case .equipment: return "shippingbox.fill"
            case .terms:     return "eurosign.circle.fill"
            }
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                StepIndicator(current: step)
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 18)

                ScrollView {
                    VStack(spacing: 18) {
                        if let error = model.errorMessage {
                            ErrorBanner(message: error)
                        }

                        switch step {
                        case .client:    clientStep
                        case .equipment: equipmentStep
                        case .terms:     termsStep
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)
                    .frame(maxWidth: 640)
                    .frame(maxWidth: .infinity)
                }
                .scrollDismissesKeyboard(.interactively)

                footer
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Nouvelle demande")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Annuler") { dismiss() }
                }
            }
            .sheet(isPresented: $isPickingProduct) {
                ProductPicker { model.lines.append($0) }
            }
            .task { await model.loadLeasers() }
        }
    }

    // MARK: - Étapes

    private var clientStep: some View {
        FormSection(title: "Coordonnées du client") {
            LeazrField(
                icon: "person.fill",
                placeholder: "Nom du client",
                text: $model.clientName,
                textContentType: .organizationName
            )
            LeazrField(
                icon: "envelope.fill",
                placeholder: "E-mail",
                text: $model.clientEmail,
                textContentType: .emailAddress,
                keyboardType: .emailAddress
            )
            LeazrField(
                icon: "building.2.fill",
                placeholder: "Secteur d'activité (optionnel)",
                text: $model.businessSector
            )
        }
    }

    private var equipmentStep: some View {
        VStack(spacing: 14) {
            Button { isPickingProduct = true } label: {
                HStack(spacing: 8) {
                    Image(systemName: "plus.circle.fill")
                    Text("Ajouter un produit du catalogue")
                }
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Theme.primary)
                .frame(maxWidth: .infinity)
                .frame(height: 52)
                .background(
                    RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                        .fill(Theme.primary.opacity(0.12))
                )
            }
            .buttonStyle(PressableStyle())

            ForEach(model.lines) { line in
                Card {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text(line.title)
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(Theme.foreground)
                            Spacer(minLength: 8)
                            Button {
                                model.lines.removeAll { $0.id == line.id }
                            } label: {
                                Image(systemName: "trash")
                                    .font(.system(size: 14))
                                    .foregroundStyle(Theme.destructive)
                            }
                            .buttonStyle(PressableStyle())
                        }

                        HStack {
                            Text("×\(line.quantity) · marge \(Int(line.margin)) %")
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.mutedForeground)
                            Spacer()
                            Text(Format.currency(line.financed))
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(Theme.foreground)
                        }
                    }
                }
            }

            if model.lines.isEmpty {
                EmptyHint(icon: "shippingbox", label: "Aucun équipement")
            } else {
                Card {
                    VStack(spacing: 0) {
                        DetailRow(label: "Montant financé", value: Format.currency(model.amount))
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Mensualité estimée", value: Format.currency(model.monthly), emphasis: true)
                    }
                }
            }
        }
    }

    private var termsStep: some View {
        VStack(spacing: 18) {
            if !model.leasers.isEmpty {
                FormSection(title: "Bailleur") {
                    Picker("Bailleur", selection: Binding(
                        get: { model.selectedLeaser?.id ?? "" },
                        set: { id in
                            model.selectedLeaser = model.leasers.first { $0.id == id }
                            Task { await model.loadRanges() }
                        }
                    )) {
                        ForEach(model.leasers) { Text($0.name).tag($0.id) }
                    }
                    .pickerStyle(.menu)
                    .tint(Theme.primary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 16)
                    .frame(height: 52)
                    .background(
                        RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                            .fill(Theme.surface)
                    )
                }
            }

            FormSection(title: "Durée") {
                Picker("Durée", selection: $model.duration) {
                    ForEach(model.selectedLeaser?.durations ?? [12, 24, 36, 48, 60], id: \.self) {
                        Text("\($0)").tag($0)
                    }
                }
                .pickerStyle(.segmented)

                Text("Durée en mois")
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.mutedForeground)
            }

            // Le coefficient est affiché : c'est lui qui explique la
            // mensualité, et le commercial doit pouvoir le justifier.
            Card {
                VStack(spacing: 0) {
                    DetailRow(label: "Client", value: model.clientName.isEmpty ? "—" : model.clientName)
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Montant financé", value: Format.currency(model.amount))
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Coefficient", value: String(format: "%.2f", model.coefficient))
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Durée", value: "\(model.duration) mois")
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Mensualité", value: Format.currency(model.monthly), emphasis: true)
                }
            }
        }
    }

    // MARK: - Navigation

    private var footer: some View {
        HStack(spacing: 12) {
            if step != .client {
                Button {
                    withAnimation(.smooth(duration: 0.25)) {
                        step = Step(rawValue: step.rawValue - 1) ?? .client
                    }
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                        .frame(width: 54, height: 54)
                        .background(
                            RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                .fill(Theme.surface)
                        )
                }
                .buttonStyle(PressableStyle())
            }

            if step == .terms {
                PrimaryButton(
                    title: "Créer la demande",
                    systemImage: "checkmark",
                    isLoading: model.isSaving,
                    isEnabled: model.canSubmit
                ) {
                    Task {
                        if await model.save() {
                            onCreated()
                            dismiss()
                        }
                    }
                }
            } else {
                PrimaryButton(
                    title: "Continuer",
                    systemImage: "arrow.right",
                    isEnabled: step != .client || model.hasClient
                ) {
                    withAnimation(.smooth(duration: 0.25)) {
                        step = Step(rawValue: step.rawValue + 1) ?? .terms
                    }
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
        .padding(.bottom, 8)
        .background(Theme.background)
    }
}

// MARK: - Modèle de saisie

@MainActor
@Observable
final class NewOfferModel {
    var clientName = ""
    var clientEmail = ""
    var businessSector = ""
    var equipment = ""
    var lines: [DraftEquipment] = []
    var leasers: [Leaser] = []
    var ranges: [LeaserRange] = []
    var selectedLeaser: Leaser?
    var duration = 36

    private(set) var isSaving = false
    var errorMessage: String?

    /// Montant financé : somme des lignes, marge incluse.
    var amount: Double { lines.reduce(0) { $0 + $1.financed } }

    /// Coefficient issu du barème du bailleur, pour ce montant et cette durée.
    var coefficient: Double {
        Financing.coefficient(ranges: ranges, amount: amount, duration: duration)
    }

    var monthly: Double {
        Financing.monthlyPayment(amount: amount, coefficient: coefficient)
    }

    /// Description sérialisée, au format attendu par le web.
    var equipmentJSON: String? {
        guard !lines.isEmpty else { return equipment.isEmpty ? nil : equipment }
        let payload = lines.map { line in
            [
                "title": line.title,
                "purchasePrice": line.purchasePrice,
                "quantity": line.quantity,
                "margin": line.margin,
                "monthlyPayment": Financing.monthlyPayment(
                    amount: line.financed, coefficient: coefficient
                ),
            ] as [String: Any]
        }
        guard let data = try? JSONSerialization.data(withJSONObject: payload) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    func loadLeasers() async {
        guard let companyId = await Session.shared.resolve() else { return }
        leasers = (try? await Backend.client
            .from("leasers")
            .select("id, name, available_durations")
            .eq("company_id", value: companyId)
            .execute().value) ?? []
        selectedLeaser = leasers.first
        await loadRanges()
    }

    func loadRanges() async {
        guard let leaser = selectedLeaser else { ranges = []; return }
        ranges = (try? await Backend.client
            .from("leaser_ranges")
            .select("id, min, max, coefficient, duration_months")
            .eq("leaser_id", value: leaser.id)
            .execute().value) ?? []
    }

    var hasClient: Bool { !clientName.trimmingCharacters(in: .whitespaces).isEmpty }
    var canSubmit: Bool { hasClient && !isSaving }

    func save() async -> Bool {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        guard let companyId = await Session.shared.resolve() else {
            errorMessage = "Société introuvable pour votre compte."
            return false
        }

        let payload = NewOffer(
            companyId: companyId,
            clientName: clientName.trimmingCharacters(in: .whitespaces),
            clientEmail: clientEmail.isEmpty ? nil : clientEmail,
            equipmentDescription: equipmentJSON,
            amount: amount,
            monthlyPayment: monthly,
            duration: duration
        )

        do {
            try await Backend.client.from("offers").insert(payload).execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            errorMessage = "Création impossible. Vérifiez votre connexion."
            return false
        }
    }

}

// MARK: - Composants

/// Barre de progression de l'assistant.
struct StepIndicator: View {
    let current: CreateOfferView.Step

    var body: some View {
        HStack(spacing: 0) {
            ForEach(CreateOfferView.Step.allCases, id: \.rawValue) { step in
                let done = step.rawValue < current.rawValue
                let active = step == current
                let tint: Color = done ? Theme.emerald : (active ? Theme.primary : Theme.border)

                VStack(spacing: 6) {
                    ZStack {
                        Circle().fill(tint.opacity(done || active ? 1 : 0.35))
                            .frame(width: 30, height: 30)
                        Image(systemName: done ? "checkmark" : step.icon)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(done || active ? .white : Theme.mutedForeground)
                    }

                    Text(step.title)
                        .font(.system(size: 11, weight: active ? .semibold : .regular))
                        .foregroundStyle(active ? Theme.foreground : Theme.mutedForeground)
                }
                .frame(maxWidth: .infinity)
                .overlay(alignment: .top) {
                    // Trait de liaison entre les pastilles, aligné sur leur axe.
                    if step.rawValue < CreateOfferView.Step.allCases.count - 1 {
                        GeometryReader { proxy in
                            Rectangle()
                                .fill(done ? Theme.emerald : Theme.border)
                                .frame(height: 2)
                                .offset(x: proxy.size.width / 2 + 15, y: 14)
                                .frame(width: proxy.size.width - 30)
                        }
                    }
                }
            }
        }
        .animation(.smooth(duration: 0.25), value: current)
    }
}

struct FormSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title.uppercased())
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Theme.mutedForeground)
                .tracking(0.6)
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct LeazrTextArea: View {
    let placeholder: String
    @Binding var text: String
    @FocusState private var isFocused: Bool

    var body: some View {
        ZStack(alignment: .topLeading) {
            if text.isEmpty {
                Text(placeholder)
                    .font(.system(size: 17))
                    .foregroundStyle(Theme.mutedForeground.opacity(0.7))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 16)
                    .allowsHitTesting(false)
            }

            TextEditor(text: $text)
                .focused($isFocused)
                .font(.system(size: 17))
                .foregroundStyle(Theme.foreground)
                .scrollContentBackground(.hidden)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
        }
        .frame(height: 130)
        .background(
            RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                .fill(Theme.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                .strokeBorder(isFocused ? Theme.primary : Theme.border, lineWidth: isFocused ? 1.6 : 1)
        )
        .animation(.easeOut(duration: 0.18), value: isFocused)
    }
}
