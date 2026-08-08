import Foundation
import Observation
import SwiftUI
import Supabase

/// Création d'une demande, calquée sur le formulaire web.
///
/// Trois étapes — Configuration, Équipements, Validation — réduites à deux
/// lorsque les produits sont « à déterminer », exactement comme le web. Le
/// découpage compte sur mobile : un formulaire d'un seul tenant décourage la
/// saisie, et les étapes correspondent à des décisions distinctes.
struct CreateOfferView: View {

    @Environment(\.dismiss) private var dismiss
    @State private var model = NewOfferModel()
    @State private var step = 1
    @State private var isPickingProduct = false
    @State private var isPickingClient = false

    var onCreated: () -> Void = {}

    private var totalSteps: Int { model.productsToBeDetermined ? 2 : 3 }

    private var stepLabels: [String] {
        model.productsToBeDetermined
            ? ["Configuration", "Validation"]
            : ["Configuration", "Équipements", "Validation"]
    }

    /// En mode « à déterminer », l'étape 3 est rendue à la position 2.
    private var displayedStep: Int {
        model.productsToBeDetermined && step == 3 ? 2 : step
    }

    private var canAdvance: Bool {
        switch step {
        case 1: return model.hasClient && (model.selectedLeaser != nil || model.isPurchase)
        case 2: return model.productsToBeDetermined || !model.lines.isEmpty
        default: return true
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                StepIndicator(labels: stepLabels, current: displayedStep)
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 18)

                ScrollView {
                    VStack(spacing: 18) {
                        if let error = model.errorMessage {
                            ErrorBanner(message: error)
                        }

                        switch step {
                        case 1: configurationStep
                        case 2: model.productsToBeDetermined ? AnyView(validationStep) : AnyView(equipmentStep)
                        default: validationStep
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
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .sheet(isPresented: $isPickingProduct) {
                ProductPicker { model.lines.append($0) }
            }
            .sheet(isPresented: $isPickingClient) {
                ClientPicker { model.apply(client: $0) }
            }
            .task { await model.loadLeasers() }
        }
    }

    // MARK: - 1. Configuration

    private var configurationStep: some View {
        VStack(spacing: 18) {
            FormSection(title: "Client") {
                Button { isPickingClient = true } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.system(size: 18))
                            .foregroundStyle(Theme.primary)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(model.hasClient ? model.clientName : "Choisir un client")
                                .font(.system(size: 16, weight: model.hasClient ? .semibold : .regular))
                                .foregroundStyle(model.hasClient ? Theme.foreground : Theme.mutedForeground)
                            if !model.clientEmail.isEmpty {
                                Text(model.clientEmail)
                                    .font(.system(size: 13))
                                    .foregroundStyle(Theme.mutedForeground)
                            }
                        }

                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Theme.mutedForeground)
                    }
                    .padding(.horizontal, 16)
                    .frame(height: 62)
                    .background(
                        RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                            .fill(Theme.surface)
                    )
                }
                .buttonStyle(PressableStyle())

                // Un client absent du fichier peut être saisi directement :
                // le web l'autorise aussi, pour ne pas bloquer une demande.
                LeazrField(
                    icon: "pencil",
                    placeholder: "…ou saisir un nom",
                    text: $model.clientName
                )
            }

            FormSection(title: "Financement") {
                Toggle(isOn: $model.isPurchase) {
                    Text("Achat direct (sans bailleur)")
                        .font(.system(size: 15))
                        .foregroundStyle(Theme.foreground)
                }
                .tint(Theme.primary)
                .padding(.horizontal, 16)
                .frame(height: 54)
                .background(
                    RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                        .fill(Theme.surface)
                )

                if !model.isPurchase, !model.leasers.isEmpty {
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
                    .frame(height: 54)
                    .background(
                        RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                            .fill(Theme.surface)
                    )
                }
            }

            FormSection(title: "Produits") {
                Toggle(isOn: $model.productsToBeDetermined) {
                    Text("Produits à déterminer")
                        .font(.system(size: 15))
                        .foregroundStyle(Theme.foreground)
                }
                .tint(Theme.primary)
                .padding(.horizontal, 16)
                .frame(height: 54)
                .background(
                    RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                        .fill(Theme.surface)
                )

                // Sans produits identifiés, le budget estimé sert de base au
                // calcul — le web applique alors le coefficient maximal.
                if model.productsToBeDetermined {
                    LeazrField(
                        icon: "eurosign",
                        placeholder: "Budget estimé (€)",
                        text: $model.estimatedBudget,
                        keyboardType: .decimalPad
                    )
                }
            }

            durationSection
        }
    }

    // MARK: - 2. Équipements

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
                FormSection(title: "Remise commerciale : \(Int(model.discountPercent)) %") {
                    Slider(value: $model.discountPercent, in: 0...30, step: 0.5)
                        .tint(Theme.amber)
                }

                totalsCard
            }
        }
    }

    // MARK: - 3. Validation

    private var validationStep: some View {
        VStack(spacing: 16) {
            HighlightCard(
                label: "Mensualité",
                value: Format.currency(model.monthly),
                tint: Theme.primary
            )

            Card {
                VStack(spacing: 0) {
                    DetailRow(label: "Client", value: model.clientName.isEmpty ? "—" : model.clientName)
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Financement", value: model.isPurchase ? "Achat direct" : (model.selectedLeaser?.name ?? "—"))
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Durée", value: "\(model.duration) mois")
                    Divider().overlay(Theme.border)
                    if model.productsToBeDetermined {
                        DetailRow(label: "Produits", value: "À déterminer")
                        Divider().overlay(Theme.border)
                    }
                    DetailRow(label: "Montant financé", value: Format.currency(model.amount))
                    if model.discountPercent > 0 {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Remise", value: "−\(Int(model.discountPercent)) %")
                    }
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Coefficient", value: String(format: "%.2f", model.coefficient))
                }
            }

            if !model.lines.isEmpty {
                SectionHeader(title: "Équipements", count: model.lines.count)
                ForEach(model.lines) { line in
                    Card {
                        HStack {
                            Text(line.title)
                                .font(.system(size: 14))
                                .foregroundStyle(Theme.foreground)
                            Spacer()
                            Text("×\(line.quantity)")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Blocs partagés

    private var durationSection: some View {
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
    }

    private var totalsCard: some View {
        Card {
            VStack(spacing: 0) {
                DetailRow(label: "Montant financé", value: Format.currency(model.amount))
                Divider().overlay(Theme.border)
                DetailRow(label: "Coefficient", value: String(format: "%.2f", model.coefficient))
                Divider().overlay(Theme.border)
                DetailRow(label: "Mensualité", value: Format.currency(model.monthly), emphasis: true)
            }
        }
    }

    private var footer: some View {
        HStack(spacing: 12) {
            if step > 1 {
                Button {
                    withAnimation(.smooth(duration: 0.25)) {
                        step = (step == 3 && model.productsToBeDetermined) ? 1 : step - 1
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

            if displayedStep == totalSteps {
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
                    isEnabled: canAdvance
                ) {
                    withAnimation(.smooth(duration: 0.25)) {
                        step = (step == 1 && model.productsToBeDetermined) ? 3 : step + 1
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

// MARK: - Sélection d'un client existant

struct ClientPicker: View {
    @Environment(\.dismiss) private var dismiss
    let onSelect: (Client) -> Void

    @State private var store = ListStore<Client>(
        table: "clients",
        columns: "id, name, email, company, status, phone, contact_name, vat_number, address, city, postal_code, country, notes, created_at",
        matches: { c, q in
            c.name.lowercased().contains(q) || (c.company?.lowercased().contains(q) ?? false)
        }
    )

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 10) {
                    ForEach(store.filtered) { client in
                        Button {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            onSelect(client)
                            dismiss()
                        } label: {
                            Card {
                                HStack(spacing: 12) {
                                    Text(client.initials)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(Theme.primary)
                                        .frame(width: 40, height: 40)
                                        .background(Circle().fill(Theme.primary.opacity(0.14)))

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(client.name)
                                            .font(.system(size: 15, weight: .semibold))
                                            .foregroundStyle(Theme.foreground)
                                        if let sub = client.company ?? client.email {
                                            Text(sub)
                                                .font(.system(size: 13))
                                                .foregroundStyle(Theme.mutedForeground)
                                        }
                                    }
                                    Spacer(minLength: 0)
                                }
                            }
                        }
                        .buttonStyle(PressableStyle())
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Clients")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: Bindable(store).search, prompt: "Nom ou société")
            .task { if store.items.isEmpty { await store.load() } }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
        }
    }
}

// MARK: - Modèle de saisie

@MainActor
@Observable
final class NewOfferModel {
    var clientId: String?
    var clientName = ""
    var clientEmail = ""
    var lines: [DraftEquipment] = []
    var leasers: [Leaser] = []
    var ranges: [LeaserRange] = []
    var selectedLeaser: Leaser?
    var duration = 36
    var isPurchase = false
    var productsToBeDetermined = false
    var estimatedBudget = ""
    var discountPercent: Double = 0

    private(set) var isSaving = false
    var errorMessage: String?

    func apply(client: Client) {
        clientId = client.id
        clientName = client.name
        clientEmail = client.email ?? ""
    }

    /// Montant financé : le budget estimé si les produits sont à déterminer,
    /// sinon la somme des lignes, remise déduite.
    var amount: Double {
        if productsToBeDetermined {
            return Double(estimatedBudget.replacingOccurrences(of: ",", with: ".")) ?? 0
        }
        let gross = lines.reduce(0) { $0 + $1.financed }
        return gross * (1 - discountPercent / 100)
    }

    var coefficient: Double {
        Financing.coefficient(ranges: ranges, amount: amount, duration: duration)
    }

    var monthly: Double {
        isPurchase ? 0 : Financing.monthlyPayment(amount: amount, coefficient: coefficient)
    }

    var hasClient: Bool { !clientName.trimmingCharacters(in: .whitespaces).isEmpty }
    var canSubmit: Bool { hasClient && !isSaving }

    var equipmentJSON: String? {
        guard !lines.isEmpty else { return nil }
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
            clientId: clientId,
            clientName: clientName.trimmingCharacters(in: .whitespaces),
            clientEmail: clientEmail.isEmpty ? nil : clientEmail,
            equipmentDescription: equipmentJSON,
            amount: amount,
            monthlyPayment: monthly,
            coefficient: coefficient,
            duration: duration,
            estimatedBudget: productsToBeDetermined ? amount : nil,
            discountValue: discountPercent > 0 ? discountPercent : nil
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
    let labels: [String]
    let current: Int

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(labels.enumerated()), id: \.offset) { index, label in
                let number = index + 1
                let done = number < current
                let active = number == current
                let tint: Color = done ? Theme.emerald : (active ? Theme.primary : Theme.border)

                VStack(spacing: 6) {
                    ZStack {
                        Circle().fill(tint.opacity(done || active ? 1 : 0.35))
                            .frame(width: 30, height: 30)
                        if done {
                            Image(systemName: "checkmark")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(.white)
                        } else {
                            Text("\(number)")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundStyle(active ? .white : Theme.mutedForeground)
                        }
                    }

                    Text(label)
                        .font(.system(size: 11, weight: active ? .semibold : .regular))
                        .foregroundStyle(active ? Theme.foreground : Theme.mutedForeground)
                }
                .frame(maxWidth: .infinity)
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
