import Foundation
import Observation
import SwiftUI
import Supabase

/// Modification d'une demande existante : équipements, quantités, marges.
///
/// Les formules sont reprises telles quelles de `GlobalMarginEditor.tsx` et de
/// `RecalculateFinancialsButton.tsx`. Elles ne doivent pas diverger : c'est le
/// même dossier qui sera repris sur le web, et une mensualité recalculée
/// différemment ferait mentir l'offre déjà envoyée au client.
@MainActor
@Observable
final class OfferEditStore {

    private(set) var lines: [EditableLine] = []
    private(set) var isLoading = false
    private(set) var isSaving = false
    var errorMessage: String?

    let offer: Offer
    private var coefficient: Double = 0

    init(offer: Offer) {
        self.offer = offer
    }

    /// Ligne d'équipement en cours d'édition. Séparée du modèle décodé pour
    /// que les curseurs puissent bouger sans écrire en base à chaque frappe.
    @Observable
    final class EditableLine: Identifiable {
        let id: String
        var title: String
        var quantity: Int
        var purchasePrice: Double
        var margin: Double
        /// Trace de l'état serveur, pour n'écrire que ce qui a changé.
        let original: OfferEquipment
        var isDeleted = false

        init(_ item: OfferEquipment) {
            id = item.id
            title = item.title
            quantity = item.quantity
            purchasePrice = item.purchasePrice
            // Une marge absente se déduit du prix de vente : sans ça, rouvrir
            // une vieille demande remettrait toutes les marges à zéro.
            if item.margin > 0 {
                margin = item.margin
            } else if item.purchasePrice > 0, item.sellingPrice > 0 {
                margin = ((item.sellingPrice / item.purchasePrice) - 1) * 100
            } else {
                margin = 0
            }
            original = item
        }

        /// Prix de vente unitaire.
        var sellingPrice: Double {
            (purchasePrice * (1 + margin / 100)).rounded(toPlaces: 2)
        }

        var sellingTotal: Double { sellingPrice * Double(quantity) }
        var purchaseTotal: Double { purchasePrice * Double(quantity) }

        func monthlyPayment(coefficient: Double, isPurchase: Bool) -> Double {
            guard !isPurchase, coefficient > 0 else { return 0 }
            return ((sellingTotal * coefficient) / 100).rounded(toPlaces: 2)
        }
    }

    // MARK: Totaux

    var totalPurchase: Double { active.reduce(0) { $0 + $1.purchaseTotal } }
    var totalSelling: Double { active.reduce(0) { $0 + $1.sellingTotal } }
    var totalMonthly: Double {
        active.reduce(0) { $0 + $1.monthlyPayment(coefficient: coefficient, isPurchase: offer.isPurchase) }
    }
    var totalMargin: Double { totalSelling - totalPurchase }
    var marginPercent: Double {
        totalPurchase > 0 ? ((totalSelling / totalPurchase) - 1) * 100 : 0
    }
    var appliedCoefficient: Double { coefficient }

    private var active: [EditableLine] { lines.filter { !$0.isDeleted } }

    // MARK: Chargement

    func load() async {
        isLoading = true
        defer { isLoading = false }

        let rows: [OfferEquipment] = (try? await Backend.client
            .from("offer_equipment")
            .select(OfferEquipment.columns)
            .eq("offer_id", value: offer.id)
            .order("created_at", ascending: true)
            .execute().value) ?? []

        lines = rows.map(EditableLine.init)

        struct Row: Decodable {
            let coefficient: Double?
        }
        let offers: [Row] = (try? await Backend.client
            .from("offers")
            .select("coefficient")
            .eq("id", value: offer.id)
            .limit(1)
            .execute().value) ?? []
        coefficient = offers.first?.coefficient ?? 0
    }

    // MARK: Édition

    func add(_ draft: DraftEquipment) {
        // Une ligne neuve n'a pas encore d'identifiant serveur : on lui en
        // donne un local, l'insertion lui attribuera le vrai.
        let json = """
        {"id":"new-\(UUID().uuidString)","title":\(Self.quoted(draft.title)),
         "quantity":\(draft.quantity),"purchase_price":\(draft.purchasePrice),
         "monthly_payment":0,"margin":\(draft.margin),"selling_price":0}
        """
        guard let item = try? JSONDecoder().decode(OfferEquipment.self, from: Data(json.utf8)) else {
            return
        }
        lines.append(EditableLine(item))
    }

    func remove(_ line: EditableLine) {
        if line.id.hasPrefix("new-") {
            lines.removeAll { $0.id == line.id }
        } else {
            line.isDeleted = true
        }
    }

    /// Applique une marge unique à toutes les lignes, comme l'éditeur de marge
    /// globale du web.
    func applyGlobalMargin(_ percent: Double) {
        for line in active { line.margin = percent }
    }

    // MARK: Enregistrement

    func save() async -> Bool {
        isSaving = true
        defer { isSaving = false }
        errorMessage = nil

        do {
            for line in lines where line.isDeleted && !line.id.hasPrefix("new-") {
                try await Backend.client
                    .from("offer_equipment")
                    .delete()
                    .eq("id", value: line.id)
                    .execute()
            }

            for line in active {
                let monthly = line.monthlyPayment(coefficient: coefficient, isPurchase: offer.isPurchase)
                let payload: [String: AnyJSON] = [
                    "title": .string(line.title),
                    "quantity": .integer(line.quantity),
                    "purchase_price": .double(line.purchasePrice.rounded(toPlaces: 2)),
                    "margin": .double(line.margin.rounded(toPlaces: 2)),
                    "selling_price": .double(line.sellingPrice),
                    // Convention de la base : `monthly_payment` est le total de
                    // la ligne, quantités comprises.
                    "monthly_payment": .double(monthly),
                ]

                if line.id.hasPrefix("new-") {
                    var insert = payload
                    insert["offer_id"] = .string(offer.id)
                    try await Backend.client
                        .from("offer_equipment")
                        .insert(insert)
                        .execute()
                } else {
                    try await Backend.client
                        .from("offer_equipment")
                        .update(payload)
                        .eq("id", value: line.id)
                        .execute()
                }
            }

            // Report sur la demande : montant d'achat, montant financé,
            // mensualité et marge en euros.
            try await Backend.client
                .from("offers")
                .update([
                    "amount": AnyJSON.double(totalPurchase.rounded(toPlaces: 2)),
                    "financed_amount": .double(totalSelling.rounded(toPlaces: 2)),
                    "monthly_payment": .double(totalMonthly.rounded(toPlaces: 2)),
                    "margin": .double(totalMargin.rounded(toPlaces: 2)),
                ])
                .eq("id", value: offer.id)
                .execute()

            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            errorMessage = "Enregistrement impossible."
            return false
        }
    }

    private static func quoted(_ value: String) -> String {
        let escaped = value
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "\"", with: "\\\"")
            .replacingOccurrences(of: "\n", with: " ")
        return "\"\(escaped)\""
    }
}

extension Double {
    func rounded(toPlaces places: Int) -> Double {
        let factor = pow(10.0, Double(places))
        return (self * factor).rounded() / factor
    }
}

// MARK: - Écran

struct EditOfferView: View {

    @Environment(\.dismiss) private var dismiss

    let offer: Offer
    let onSaved: () async -> Void

    @State private var store: OfferEditStore
    @State private var isAddingProduct = false
    @State private var isEditingGlobalMargin = false
    @State private var globalMargin: Double = 20

    init(offer: Offer, onSaved: @escaping () async -> Void) {
        self.offer = offer
        self.onSaved = onSaved
        _store = State(initialValue: OfferEditStore(offer: offer))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if let error = store.errorMessage {
                        ErrorBanner(message: error)
                    }

                    totals

                    SectionHeader(title: "Équipements", count: store.lines.filter { !$0.isDeleted }.count)

                    ForEach(store.lines.filter { !$0.isDeleted }) { line in
                        EquipmentEditCard(
                            line: line,
                            coefficient: store.appliedCoefficient,
                            isPurchase: offer.isPurchase
                        ) {
                            store.remove(line)
                        }
                    }

                    TertiaryButton(title: "Ajouter un équipement", systemImage: "plus.circle") {
                        isAddingProduct = true
                    }

                    PrimaryButton(
                        title: "Enregistrer",
                        systemImage: "checkmark.circle.fill",
                        isLoading: store.isSaving,
                        isEnabled: !store.lines.filter { !$0.isDeleted }.isEmpty
                    ) {
                        Task {
                            if await store.save() {
                                await onSaved()
                                dismiss()
                            }
                        }
                    }
                }
                .padding(20)
                .frame(maxWidth: 700)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Modifier la demande")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Annuler") { dismiss() }
                }
            }
            .sheet(isPresented: $isAddingProduct) {
                ProductPicker { store.add($0) }
            }
            .sheet(isPresented: $isEditingGlobalMargin) {
                GlobalMarginSheet(
                    initial: store.marginPercent,
                    totalPurchase: store.totalPurchase,
                    coefficient: store.appliedCoefficient,
                    isPurchase: offer.isPurchase
                ) { percent in
                    store.applyGlobalMargin(percent)
                }
                .presentationDetents([.height(420)])
            }
            .task { await store.load() }
            .overlay {
                if store.isLoading && store.lines.isEmpty {
                    ProgressView().tint(Theme.mutedForeground)
                }
            }
        }
    }

    /// Le bandeau de totaux se recalcule à chaque ajustement : c'est lui qui
    /// dit si la demande reste vendable.
    private var totals: some View {
        Card {
            VStack(spacing: 0) {
                DetailRow(label: "Prix d'achat total", value: Format.currency(store.totalPurchase))
                Divider().overlay(Theme.border)
                DetailRow(label: "Montant financé", value: Format.currency(store.totalSelling))
                Divider().overlay(Theme.border)
                DetailRow(label: "Marge", value: Format.currency(store.totalMargin))

                Divider().overlay(Theme.border)

                Button {
                    globalMargin = store.marginPercent
                    isEditingGlobalMargin = true
                } label: {
                    HStack {
                        Text("Marge globale")
                            .font(.system(size: 15))
                            .foregroundStyle(Theme.mutedForeground)
                        Spacer()
                        Text(String(format: "%.1f %%", store.marginPercent))
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Theme.primary)
                        Image(systemName: "slider.horizontal.3")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Theme.primary)
                    }
                    .padding(.vertical, 12)
                }
                .buttonStyle(.plain)

                if !offer.isPurchase {
                    Divider().overlay(Theme.border)
                    DetailRow(
                        label: "Mensualité",
                        value: Format.currency(store.totalMonthly),
                        emphasis: true
                    )
                    if store.appliedCoefficient > 0 {
                        Divider().overlay(Theme.border)
                        DetailRow(
                            label: "Coefficient",
                            value: String(format: "%.3f", store.appliedCoefficient)
                        )
                    }
                }
            }
        }
    }
}

/// Une ligne d'équipement : titre, quantité, prix d'achat, marge, et ce que
/// cela donne pour le client.
struct EquipmentEditCard: View {

    @Bindable var line: OfferEditStore.EditableLine
    let coefficient: Double
    let isPurchase: Bool
    let onDelete: () -> Void

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .top, spacing: 8) {
                    TextField("Désignation", text: $line.title, axis: .vertical)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Theme.foreground)

                    Button(role: .destructive, action: onDelete) {
                        Image(systemName: "trash")
                            .font(.system(size: 15))
                            .foregroundStyle(Theme.destructive)
                    }
                    .buttonStyle(.plain)
                }

                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Prix d'achat")
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.mutedForeground)
                        TextField("0", value: $line.purchasePrice, format: .number)
                            .keyboardType(.decimalPad)
                            .font(.system(size: 15, weight: .semibold))
                            .padding(.horizontal, 12)
                            .frame(height: 42)
                            .background(
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .fill(Theme.background)
                            )
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Quantité")
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.mutedForeground)
                        Stepper("\(line.quantity)", value: $line.quantity, in: 1...200)
                            .padding(.horizontal, 12)
                            .frame(height: 42)
                            .background(
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .fill(Theme.background)
                            )
                    }
                }

                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("Marge")
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.mutedForeground)
                        Spacer()
                        Text(String(format: "%.1f %%", line.margin))
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Theme.primary)
                    }
                    Slider(value: $line.margin, in: 0...80, step: 0.5)
                        .tint(Theme.primary)
                }

                Divider().overlay(Theme.border)

                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Prix de vente")
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.mutedForeground)
                        Text(Format.currency(line.sellingTotal))
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Theme.foreground)
                    }

                    Spacer()

                    if !isPurchase {
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("Mensualité")
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.mutedForeground)
                            Text(Format.currency(
                                line.monthlyPayment(coefficient: coefficient, isPurchase: isPurchase)
                            ))
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(Theme.primary)
                        }
                    }
                }
            }
        }
    }
}

/// Marge unique appliquée à toutes les lignes, avec aperçu du résultat avant
/// de valider.
struct GlobalMarginSheet: View {

    @Environment(\.dismiss) private var dismiss

    let initial: Double
    let totalPurchase: Double
    let coefficient: Double
    let isPurchase: Bool
    let onApply: (Double) -> Void

    @State private var percent: Double = 20

    private var newSelling: Double { totalPurchase * (1 + percent / 100) }
    private var newMonthly: Double {
        guard !isPurchase, coefficient > 0 else { return 0 }
        return (newSelling * coefficient) / 100
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    FormSection(title: "Marge appliquée à toutes les lignes") {
                        VStack(spacing: 10) {
                            Text(String(format: "%.1f %%", percent))
                                .font(.system(size: 34, weight: .bold))
                                .foregroundStyle(Theme.primary)
                            Slider(value: $percent, in: 0...80, step: 0.5)
                                .tint(Theme.primary)
                        }
                    }

                    Card {
                        VStack(spacing: 0) {
                            DetailRow(label: "Prix d'achat total", value: Format.currency(totalPurchase))
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Nouveau montant financé", value: Format.currency(newSelling))
                            Divider().overlay(Theme.border)
                            DetailRow(
                                label: "Nouvelle marge",
                                value: Format.currency(newSelling - totalPurchase)
                            )
                            if !isPurchase, coefficient > 0 {
                                Divider().overlay(Theme.border)
                                DetailRow(
                                    label: "Nouvelle mensualité",
                                    value: Format.currency(newMonthly),
                                    emphasis: true
                                )
                            }
                        }
                    }

                    PrimaryButton(title: "Appliquer", systemImage: "checkmark") {
                        onApply(percent)
                        dismiss()
                    }
                }
                .padding(20)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Marge globale")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Annuler") { dismiss() } }
            }
            .onAppear { percent = initial > 0 ? initial : 20 }
        }
    }
}
