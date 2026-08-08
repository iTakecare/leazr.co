import Foundation
import Observation
import SwiftUI
import Supabase

@MainActor
@Observable
final class OfferDetailStore {
    private(set) var equipment: [OfferEquipment] = []
    private(set) var documents: [OfferDocument] = []
    private(set) var calls: [CallLog] = []
    private(set) var isWorking = false
    var errorMessage: String?

    func load(offerId: String) async {
        async let e: Void = loadEquipment(offerId)
        async let d: Void = loadDocuments(offerId)
        async let c: Void = loadCalls(offerId)
        _ = await (e, d, c)
    }

    private func loadEquipment(_ offerId: String) async {
        equipment = (try? await Backend.client
            .from("offer_equipment")
            .select("id, title, quantity, purchase_price, monthly_payment")
            .eq("offer_id", value: offerId)
            .execute().value) ?? []
    }

    private func loadDocuments(_ offerId: String) async {
        documents = (try? await Backend.client
            .from("offer_documents")
            .select("id, file_name, document_type, status, file_size, admin_notes, uploaded_at")
            .eq("offer_id", value: offerId)
            .order("uploaded_at", ascending: false)
            .execute().value) ?? []
    }

    private func loadCalls(_ offerId: String) async {
        calls = (try? await Backend.client
            .from("offer_call_logs")
            .select("id, status, notes, called_at, callback_date")
            .eq("offer_id", value: offerId)
            .order("called_at", ascending: false)
            .limit(30)
            .execute().value) ?? []
    }

    /// Valide ou refuse un document. L'app native devient ainsi un outil de
    /// traitement, pas seulement de consultation.
    func setDocumentStatus(_ document: OfferDocument, to status: String, offerId: String) async {
        isWorking = true
        defer { isWorking = false }

        do {
            try await Backend.client
                .from("offer_documents")
                .update(["status": status])
                .eq("id", value: document.id)
                .execute()

            UINotificationFeedbackGenerator().notificationOccurred(.success)
            await loadDocuments(offerId)
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            errorMessage = "Mise à jour impossible."
        }
    }

    var pendingDocuments: Int { documents.filter(\.isPending).count }
}

/// Détail d'une offre, organisé en sections navigables.
struct OfferDetailView: View {
    let offer: Offer

    @State private var store = OfferDetailStore()
    @State private var workflow = WorkflowStore()
    @State private var section: Section = .summary

    enum Section: String, CaseIterable {
        case summary = "Résumé"
        case documents = "Documents"
        case calls = "Appels"
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let error = store.errorMessage {
                    ErrorBanner(message: error)
                }

                HighlightCard(
                    label: "Mensualité",
                    value: Format.currency(offer.monthlyPayment),
                    tint: Theme.primary
                )

                Picker("Section", selection: $section) {
                    ForEach(Section.allCases, id: \.self) { s in
                        if s == .documents, store.pendingDocuments > 0 {
                            Text("\(s.rawValue) (\(store.pendingDocuments))").tag(s)
                        } else {
                            Text(s.rawValue).tag(s)
                        }
                    }
                }
                .pickerStyle(.segmented)

                switch section {
                case .summary:   summarySection
                case .documents: documentsSection
                case .calls:     callsSection
                }
            }
            .padding(20)
            .frame(maxWidth: 700)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle(offer.clientName)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await store.load(offerId: offer.id)
            await workflow.load()
        }
        .refreshable { await store.load(offerId: offer.id) }
    }

    // MARK: - Résumé

    private var summarySection: some View {
        VStack(spacing: 14) {
            if !workflow.steps.isEmpty {
                WorkflowTimeline(steps: workflow.steps, currentKey: offer.status)
            }

            Card {
                VStack(spacing: 0) {
                    DetailRow(label: "Client", value: offer.clientName)
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Statut", value: offer.statusLabel)
                    if let dossier = offer.dossierNumber {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "N° de dossier", value: dossier)
                    }
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Montant financé", value: Format.currency(offer.amount), emphasis: true)
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Créée le", value: Format.date(offer.createdAt))
                }
            }

            if !store.equipment.isEmpty {
                SectionHeader(title: "Équipements", count: store.equipment.count)

                ForEach(store.equipment) { item in
                    Card {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(alignment: .top) {
                                Text(item.title)
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(Theme.foreground)
                                Spacer(minLength: 8)
                                if item.quantity > 1 {
                                    Text("×\(item.quantity)")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundStyle(Theme.mutedForeground)
                                }
                            }

                            HStack {
                                Text("Mensualité")
                                    .font(.system(size: 13))
                                    .foregroundStyle(Theme.mutedForeground)
                                Spacer()
                                Text(Format.currency(item.monthlyPayment))
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(Theme.primary)
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Documents

    private var documentsSection: some View {
        VStack(spacing: 12) {
            if store.documents.isEmpty {
                EmptyHint(icon: "doc.on.doc", label: "Aucun document")
            }

            ForEach(store.documents) { doc in
                Card {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack(alignment: .top) {
                            Image(systemName: "doc.fill")
                                .font(.system(size: 18))
                                .foregroundStyle(Theme.sky)

                            VStack(alignment: .leading, spacing: 3) {
                                Text(doc.typeLabel)
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(Theme.foreground)
                                Text(doc.fileName)
                                    .font(.system(size: 13))
                                    .foregroundStyle(Theme.mutedForeground)
                                    .lineLimit(1)
                                if !doc.readableSize.isEmpty {
                                    Text(doc.readableSize)
                                        .font(.system(size: 12))
                                        .foregroundStyle(Theme.mutedForeground)
                                }
                            }

                            Spacer(minLength: 8)

                            StatusBadge(label: doc.statusLabel, status: doc.status)
                        }

                        // Les actions n'apparaissent que sur les documents en
                        // attente : rien à décider sur un dossier déjà tranché.
                        if doc.isPending {
                            Divider().overlay(Theme.border)

                            HStack(spacing: 10) {
                                ActionButton(
                                    title: "Valider",
                                    icon: "checkmark",
                                    tint: Theme.emerald
                                ) {
                                    Task { await store.setDocumentStatus(doc, to: "approved", offerId: offer.id) }
                                }

                                ActionButton(
                                    title: "Refuser",
                                    icon: "xmark",
                                    tint: Theme.destructive
                                ) {
                                    Task { await store.setDocumentStatus(doc, to: "rejected", offerId: offer.id) }
                                }
                            }
                            .disabled(store.isWorking)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Appels

    private var callsSection: some View {
        VStack(spacing: 12) {
            if store.calls.isEmpty {
                EmptyHint(icon: "phone", label: "Aucun appel enregistré")
            }

            ForEach(store.calls) { call in
                Card {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: "phone.fill")
                                .font(.system(size: 14))
                                .foregroundStyle(Theme.violet)
                            Text(call.statusLabel)
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(Theme.foreground)
                            Spacer()
                            Text(Format.date(call.calledAt))
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.mutedForeground)
                        }

                        if let notes = call.notes, !notes.isEmpty {
                            Text(notes)
                                .font(.system(size: 14))
                                .foregroundStyle(Theme.mutedForeground)
                        }

                        if let callback = call.callbackDate {
                            HStack(spacing: 6) {
                                Image(systemName: "bell.fill")
                                    .font(.system(size: 11))
                                Text("Rappel le \(Format.date(callback))")
                                    .font(.system(size: 12, weight: .medium))
                            }
                            .foregroundStyle(Theme.amber)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Composants

/// Bouton d'action secondaire, teinté par sa fonction.
struct ActionButton: View {
    let title: String
    let icon: String
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        } label: {
            HStack(spacing: 6) {
                Image(systemName: icon).font(.system(size: 13, weight: .bold))
                Text(title).font(.system(size: 14, weight: .semibold))
            }
            .foregroundStyle(tint)
            .frame(maxWidth: .infinity)
            .frame(height: 40)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(tint.opacity(0.13))
            )
        }
        .buttonStyle(PressableStyle())
    }
}

struct EmptyHint: View {
    let icon: String
    let label: String

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 34, weight: .light))
                .foregroundStyle(Theme.mutedForeground)
            Text(label)
                .font(.system(size: 15))
                .foregroundStyle(Theme.mutedForeground)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }
}

// MARK: - Workflow

@MainActor
@Observable
final class WorkflowStore {
    private(set) var steps: [WorkflowStep] = []

    /// Charge le modèle de workflow de la société pour ce type d'offre, puis
    /// ses étapes visibles, dans l'ordre défini par l'administrateur.
    func load(offerType: String = "client_request") async {
        guard let companyId = await Session.shared.resolve() else { return }

        let templates: [WorkflowTemplate] = (try? await Backend.client
            .from("workflow_templates")
            .select("id, name, offer_type")
            .eq("company_id", value: companyId)
            .eq("offer_type", value: offerType)
            .eq("is_active", value: true)
            .limit(1)
            .execute().value) ?? []

        guard let template = templates.first else { return }

        steps = (try? await Backend.client
            .from("workflow_steps")
            .select("id, step_key, step_label, step_description, step_order, is_required")
            .eq("workflow_template_id", value: template.id)
            .eq("is_visible", value: true)
            .order("step_order", ascending: true)
            .execute().value) ?? []
    }
}

/// Progression visuelle du dossier dans le workflow de la société.
struct WorkflowTimeline: View {
    let steps: [WorkflowStep]
    let currentKey: String

    private var currentIndex: Int? {
        steps.firstIndex { $0.stepKey == currentKey }
    }

    private func state(_ index: Int) -> (color: Color, icon: String) {
        guard let currentIndex else { return (Theme.border, "circle") }
        if index < currentIndex { return (Theme.emerald, "checkmark") }
        if index == currentIndex { return (Theme.primary, "circle.fill") }
        return (Theme.border, "circle")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Processus de validation")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Theme.foreground)
                Spacer()
                if let currentIndex {
                    Text("\(currentIndex + 1)/\(steps.count)")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Theme.mutedForeground)
                }
            }
            .padding(.bottom, 16)

            ForEach(Array(steps.enumerated()), id: \.element.id) { index, step in
                let s = state(index)

                HStack(alignment: .top, spacing: 12) {
                    // Pastille + trait de liaison : la colonne de gauche donne
                    // la lecture verticale de la progression.
                    VStack(spacing: 0) {
                        ZStack {
                            Circle().fill(s.color.opacity(0.18)).frame(width: 26, height: 26)
                            Image(systemName: s.icon)
                                .font(.system(size: 11, weight: .bold))
                                .foregroundStyle(s.color)
                        }

                        if index < steps.count - 1 {
                            Rectangle()
                                .fill(index < (currentIndex ?? 0) ? Theme.emerald : Theme.border)
                                .frame(width: 2)
                                .frame(minHeight: 26)
                        }
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text(step.stepLabel)
                            .font(.system(size: 15, weight: index == currentIndex ? .semibold : .regular))
                            .foregroundStyle(index <= (currentIndex ?? -1) ? Theme.foreground : Theme.mutedForeground)

                        if let description = step.stepDescription, !description.isEmpty {
                            Text(description)
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }
                    .padding(.bottom, index < steps.count - 1 ? 14 : 0)

                    Spacer(minLength: 0)
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
}
