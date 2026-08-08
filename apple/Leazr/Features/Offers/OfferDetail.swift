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
    @State private var isChangingStep = false
    @State private var isScoring = false
    @State private var currentStatus: String = ""
    @State private var logs: [WorkflowLog] = []

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
        .sheet(isPresented: $isChangingStep) {
            StatusChangeSheet(
                steps: workflow.steps,
                currentKey: resolvedStepKey
            ) { newStatus, reason in
                let ok = await workflow.changeStatus(
                    offerId: offer.id,
                    from: effectiveStatus,
                    to: newStatus,
                    reason: reason
                )
                if ok {
                    currentStatus = newStatus
                    logs = await workflow.loadLogs(offerId: offer.id)
                }
                return ok
            }
        }
        .sheet(isPresented: $isScoring) {
            if let scoringStep {
                ScoringSheet(step: scoringStep) { score, motif, note in
                    let target = workflow.destination(for: score, on: scoringStep)
                    let ok = await workflow.applyScore(
                        offerId: offer.id,
                        from: effectiveStatus,
                        to: target,
                        scoringType: scoringStep.scoringType ?? "internal",
                        score: score,
                        rejectionCategory: motif,
                        reason: note
                    )
                    if ok {
                        currentStatus = target
                        logs = await workflow.loadLogs(offerId: offer.id)
                    }
                    return ok
                }
            }
        }
        .task {
            await store.load(offerId: offer.id)
            await workflow.load(for: offer)
            logs = await workflow.loadLogs(offerId: offer.id)
        }
        .refreshable { await store.load(offerId: offer.id) }
    }

    /// Statut affiché : celui du serveur, ou celui qu'on vient d'appliquer.
    private var effectiveStatus: String {
        currentStatus.isEmpty ? offer.currentStep : currentStatus
    }

    /// Libellé de l'étape du workflow — distinct du statut, qui peut en être un
    /// sous-état (« Analyse interne » vs « Docs interne »).
    private var currentStepLabel: String {
        label(for: resolvedStepKey)
    }

    /// Libellé d'un statut selon le workflow de la société, avec repli sur le
    /// vocabulaire partagé avec le web.
    private func label(for key: String) -> String {
        workflow.steps.first { $0.stepKey == key }?.stepLabel
            ?? OfferStatus.label(key)
    }

    /// Clé de l'étape où se situe le dossier, sous-statuts résolus. Sans cela,
    /// aucune ligne n'était marquée « Actuelle » dans le sélecteur d'étape.
    private var resolvedStepKey: String {
        guard let index = OfferStatus.stepIndex(for: effectiveStatus, in: workflow.steps),
              index < workflow.steps.count
        else { return effectiveStatus }
        return workflow.steps[index].stepKey
    }

    /// Étape de scoring en cours, s'il y en a une : c'est elle qui débloque
    /// l'analyse A/B/C/D au lieu d'un simple changement d'étape.
    private var scoringStep: WorkflowStep? {
        guard let index = OfferStatus.stepIndex(for: effectiveStatus, in: workflow.steps),
              index < workflow.steps.count
        else { return nil }
        let step = workflow.steps[index]
        return step.enablesScoring ? step : nil
    }

    // MARK: - Résumé

    private var summarySection: some View {
        VStack(spacing: 14) {
            if !workflow.steps.isEmpty {
                WorkflowTimeline(steps: workflow.steps, currentKey: effectiveStatus)

                // Une étape de scoring appelle une décision (A/B/C/D), pas un
                // simple déplacement : c'est la distinction que fait le web.
                if let scoringStep {
                    PrimaryButton(
                        title: scoringStep.scoringType == "leaser"
                            ? "Analyse leaser"
                            : "Analyse interne",
                        systemImage: "chart.bar.doc.horizontal.fill"
                    ) {
                        isScoring = true
                    }
                }

                TertiaryButton(title: "Changer d'étape", systemImage: "arrow.right.circle") {
                    isChangingStep = true
                }
            }

            Card {
                VStack(spacing: 0) {
                    DetailRow(label: "Client", value: offer.clientName)
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Statut", value: OfferStatus.label(effectiveStatus))
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Étape", value: currentStepLabel)
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Type", value: offer.typeLabel)
                    if let dossier = offer.dossierNumber {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "N° de dossier", value: dossier)
                    }
                    if let score = offer.internalScore, !score.isEmpty {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Score interne", value: score)
                    }
                    if let score = offer.leaserScore, !score.isEmpty {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Score leaser", value: score)
                    }
                    if effectiveStatus.contains("rejected"), let motif = offer.rejectionCategory {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Motif du refus", value: OfferMotif.rejectionLabel(motif))
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

            if !logs.isEmpty {
                SectionHeader(title: "Historique", count: logs.count)

                ForEach(logs) { log in
                    Card {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack(spacing: 8) {
                                Image(systemName: "arrow.right.circle.fill")
                                    .font(.system(size: 13))
                                    .foregroundStyle(Theme.violet)
                                Text(label(for: log.newStatus))
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(Theme.foreground)
                                Spacer()
                                Text(Format.date(log.createdAt))
                                    .font(.system(size: 12))
                                    .foregroundStyle(Theme.mutedForeground)
                            }

                            if let reason = log.reason, !reason.isEmpty {
                                Text(reason)
                                    .font(.system(size: 13))
                                    .foregroundStyle(Theme.mutedForeground)
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
    private(set) var isLoaded = false

    private static let stepColumns = """
        id, step_key, step_label, step_description, step_order, is_required, \
        is_visible, enables_scoring, scoring_type, next_step_on_approval, \
        next_step_on_rejection, next_step_on_docs_requested
        """

    /// Résout les étapes exactement comme le web : le modèle explicitement
    /// attaché à l'offre d'abord, sinon la RPC `get_workflow_for_offer_type`,
    /// sinon les étapes par défaut. On n'affiche jamais une timeline vide.
    func load(for offer: Offer) async {
        defer { isLoaded = true }

        if let templateId = offer.workflowTemplateId, !templateId.isEmpty {
            let fromTemplate = await stepsForTemplate(templateId)
            if !fromTemplate.isEmpty {
                steps = fromTemplate
                return
            }
        }

        if let companyId = await Session.shared.resolve() {
            let rpc: [WorkflowStep]? = try? await Backend.client
                .rpc("get_workflow_for_offer_type", params: [
                    "p_company_id": AnyJSON.string(companyId),
                    "p_offer_type": AnyJSON.string(offer.type ?? "client_request"),
                    "p_is_purchase": AnyJSON.bool(offer.isPurchase),
                ])
                .execute()
                .value

            if let rpc, !rpc.isEmpty {
                steps = rpc.filter(\.isVisible).sorted { $0.stepOrder < $1.stepOrder }
                return
            }

            // La RPC peut ne rien renvoyer si aucun modèle ne couvre ce type :
            // on retombe alors sur le modèle actif par défaut de la société.
            let templates: [WorkflowTemplate] = (try? await Backend.client
                .from("workflow_templates")
                .select("id, name, offer_type")
                .eq("company_id", value: companyId)
                .eq("is_active", value: true)
                .order("is_default", ascending: false)
                .limit(1)
                .execute().value) ?? []

            if let template = templates.first {
                let fromDefault = await stepsForTemplate(template.id)
                if !fromDefault.isEmpty {
                    steps = fromDefault
                    return
                }
            }
        }

        steps = WorkflowStep.defaults
    }

    private func stepsForTemplate(_ templateId: String) async -> [WorkflowStep] {
        let rows: [WorkflowStep] = (try? await Backend.client
            .from("workflow_steps")
            .select(Self.stepColumns)
            .eq("workflow_template_id", value: templateId)
            .eq("is_visible", value: true)
            .order("step_order", ascending: true)
            .execute().value) ?? []
        return rows
    }
}

/// Progression visuelle du dossier dans le workflow de la société.
///
/// L'étape courante se déduit du statut par la même cascade que le web : un
/// `internal_docs_requested` retombe sur l'étape « Analyse interne » plutôt que
/// de ne correspondre à rien — c'était la cause de la timeline entièrement
/// grisée.
struct WorkflowTimeline: View {
    let steps: [WorkflowStep]
    let currentKey: String

    private var currentIndex: Int? {
        OfferStatus.stepIndex(for: currentKey, in: steps)
    }

    /// Le statut est-il un sous-statut de l'étape courante ? Si oui, l'étape ne
    /// suffit pas à décrire la situation : on affiche les deux.
    private var subStatus: String? {
        guard let currentIndex, currentIndex < steps.count else { return nil }
        return steps[currentIndex].stepKey == currentKey ? nil : currentKey
    }

    private func state(_ index: Int) -> (color: Color, icon: String) {
        guard let currentIndex else { return (Theme.border, "circle") }
        if index < currentIndex { return (Theme.emerald, "checkmark") }
        if index == currentIndex {
            // La pastille de l'étape courante porte la couleur du statut réel :
            // ambre pour des documents attendus, rouge pour un refus.
            return (OfferStatus.tint(currentKey), OfferStatus.icon(currentKey))
        }
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

            // Bandeau du statut réel, au-dessus de la timeline : c'est
            // l'information qu'on cherche en ouvrant le dossier.
            HStack(spacing: 8) {
                Image(systemName: OfferStatus.icon(currentKey))
                    .font(.system(size: 13, weight: .bold))
                Text(OfferStatus.label(currentKey))
                    .font(.system(size: 14, weight: .bold))
                Spacer(minLength: 0)
            }
            .foregroundStyle(OfferStatus.tint(currentKey))
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(OfferStatus.tint(currentKey).opacity(0.13))
            )
            .padding(.top, 12)
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

                    VStack(alignment: .leading, spacing: 3) {
                        Text(step.stepLabel)
                            .font(.system(size: 15, weight: index == currentIndex ? .semibold : .regular))
                            .foregroundStyle(index <= (currentIndex ?? -1) ? Theme.foreground : Theme.mutedForeground)

                        if let description = step.stepDescription, !description.isEmpty {
                            Text(description)
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.mutedForeground)
                        }

                        if index == currentIndex, let subStatus {
                            HStack(spacing: 4) {
                                Circle()
                                    .fill(OfferStatus.tint(subStatus))
                                    .frame(width: 5, height: 5)
                                Text(OfferStatus.label(subStatus))
                                    .font(.system(size: 11, weight: .semibold))
                            }
                            .foregroundStyle(OfferStatus.tint(subStatus))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Capsule().fill(OfferStatus.tint(subStatus).opacity(0.13)))
                            .padding(.top, 2)
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

// MARK: - Changement d'étape

extension WorkflowStore {

    /// Fait avancer le dossier, exactement comme le service web : mise à jour
    /// de `workflow_status`, score dérivé, puis trace dans
    /// `offer_workflow_logs`. Les effets de bord serveur (libération de stock,
    /// notifications) restent gérés par le backend.
    func changeStatus(
        offerId: String,
        from previous: String,
        to newStatus: String,
        reason: String?
    ) async -> Bool {
        var update: [String: String] = ["workflow_status": newStatus]
        if let score = WorkflowScoring.scoreUpdate(for: newStatus) {
            update[score.field] = score.value
        }

        do {
            try await Backend.client
                .from("offers")
                .update(update)
                .eq("id", value: offerId)
                .execute()

            // Le log ne doit jamais faire échouer la transition : le statut est
            // déjà changé côté serveur.
            let userId = Session.shared.userId
            _ = try? await Backend.client
                .from("offer_workflow_logs")
                .insert([
                    "offer_id": offerId,
                    "user_id": userId,
                    "previous_status": previous.isEmpty ? "draft" : previous,
                    "new_status": newStatus,
                    "reason": reason,
                ])
                .execute()

            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    /// Destination d'un score, en respectant les transitions configurées par
    /// l'administrateur avant les statuts par défaut — c'est l'ordre de
    /// priorité qu'appliquent `handleInternalScoring` / `handleLeaserScoring`.
    func destination(for score: OfferScore, on step: WorkflowStep) -> String {
        let family = step.scoringType == "leaser" ? "leaser" : "internal"

        switch score {
        case .a: return step.nextStepOnApproval ?? "\(family)_approved"
        case .b: return step.nextStepOnDocsRequested ?? "\(family)_docs_requested"
        case .c: return step.nextStepOnRejection ?? "\(family)_rejected"
        case .d: return "without_follow_up"
        }
    }

    /// Applique un score : statut, note de scoring, motif de refus, puis trace.
    ///
    /// L'envoi des e-mails de refus reste au web : il dépend de gabarits
    /// multilingues et d'un éditeur riche qui n'ont pas leur place ici. Le
    /// dossier est bien classé, la communication se fait depuis le bureau.
    func applyScore(
        offerId: String,
        from previous: String,
        to newStatus: String,
        scoringType: String,
        score: OfferScore,
        rejectionCategory: String?,
        reason: String?
    ) async -> Bool {
        var update: [String: AnyJSON] = [
            "workflow_status": .string(newStatus),
            scoringType == "leaser" ? "leaser_score" : "internal_score": .string(score.rawValue),
        ]
        if score == .c, let rejectionCategory {
            update["rejection_category"] = .string(rejectionCategory)
        }

        do {
            try await Backend.client
                .from("offers")
                .update(update)
                .eq("id", value: offerId)
                .execute()

            _ = try? await Backend.client
                .from("offer_workflow_logs")
                .insert([
                    "offer_id": AnyJSON.string(offerId),
                    "user_id": Session.shared.userId.map(AnyJSON.string) ?? .null,
                    "previous_status": .string(previous.isEmpty ? "draft" : previous),
                    "new_status": .string(newStatus),
                    "reason": reason.map(AnyJSON.string) ?? .null,
                    "sub_reason": (score == .d ? rejectionCategory : nil).map(AnyJSON.string) ?? .null,
                ])
                .execute()

            UINotificationFeedbackGenerator().notificationOccurred(.success)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return false
        }
    }

    func loadLogs(offerId: String) async -> [WorkflowLog] {
        (try? await Backend.client
            .from("offer_workflow_logs")
            .select("id, previous_status, new_status, reason, created_at")
            .eq("offer_id", value: offerId)
            .order("created_at", ascending: false)
            .limit(30)
            .execute().value) ?? []
    }
}

// MARK: - Scoring

/// Décision d'analyse, reprise de `ScoringModal.tsx`.
enum OfferScore: String, CaseIterable, Identifiable {
    case a = "A"
    case b = "B"
    case c = "C"
    case d = "D"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .a: return "Validé"
        case .b: return "Documents demandés"
        case .c: return "Refusé"
        case .d: return "Sans suite"
        }
    }

    var detail: String {
        switch self {
        case .a: return "Le dossier passe à l'étape suivante."
        case .b: return "Des pièces complémentaires sont attendues du client."
        case .c: return "Le dossier est refusé, avec un motif."
        case .d: return "Le dossier est clos faute de suite du client."
        }
    }

    var icon: String {
        switch self {
        case .a: return "checkmark.circle.fill"
        case .b: return "doc.text.fill"
        case .c: return "xmark.circle.fill"
        case .d: return "person.slash.fill"
        }
    }

    var tint: Color {
        switch self {
        case .a: return Theme.emerald
        case .b: return Theme.amber
        case .c: return Theme.destructive
        case .d: return Theme.mutedForeground
        }
    }
}

/// Analyse interne ou leaser : score, motif quand il en faut un, et note.
struct ScoringSheet: View {

    @Environment(\.dismiss) private var dismiss

    let step: WorkflowStep
    let onConfirm: (OfferScore, String?, String?) async -> Bool

    @State private var score: OfferScore?
    @State private var motif: String?
    @State private var note = ""
    @State private var isWorking = false

    /// Un refus exige un motif de refus, un classement sans suite une raison
    /// d'abandon : ce sont deux nomenclatures distinctes côté web.
    private var motifs: [(code: String, label: String)]? {
        switch score {
        case .c: return OfferMotif.rejection.filter { $0.code != "unknown" }
        case .d: return OfferMotif.noFollowUp.filter { $0.code != "unknown" }
        default: return nil
        }
    }

    private var title: String {
        step.scoringType == "leaser" ? "Analyse leaser" : "Analyse interne"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    FormSection(title: "Décision") {
                        VStack(spacing: 8) {
                            ForEach(OfferScore.allCases) { option in
                                ScoreChoiceRow(score: option, isSelected: score == option) {
                                    score = option
                                    motif = nil
                                }
                            }
                        }
                    }

                    if let motifs {
                        FormSection(title: score == .c ? "Motif du refus" : "Raison de l'abandon") {
                            VStack(spacing: 8) {
                                ForEach(motifs, id: \.code) { option in
                                    MotifChoiceRow(
                                        label: option.label,
                                        isSelected: motif == option.code
                                    ) {
                                        motif = option.code
                                    }
                                }
                            }
                        }
                    }

                    FormSection(title: "Note (optionnelle)") {
                        LeazrTextArea(placeholder: "Précisez votre analyse", text: $note)
                    }

                    if score == .c {
                        Text("L'e-mail de refus au client reste à envoyer depuis le web : il utilise les gabarits multilingues.")
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.mutedForeground)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    PrimaryButton(
                        title: "Confirmer",
                        systemImage: "checkmark.circle.fill",
                        isLoading: isWorking,
                        isEnabled: score != nil && (motifs == nil || motif != nil)
                    ) {
                        guard let score else { return }
                        Task {
                            isWorking = true
                            let ok = await onConfirm(score, motif, note.isEmpty ? nil : note)
                            isWorking = false
                            if ok { dismiss() }
                        }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Annuler") { dismiss() }
                }
            }
        }
    }
}

struct ScoreChoiceRow: View {
    let score: OfferScore
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        } label: {
            HStack(spacing: 12) {
                ZStack {
                    Circle().fill(score.tint.opacity(0.16)).frame(width: 36, height: 36)
                    Image(systemName: score.icon)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(score.tint)
                }

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(score.rawValue)
                            .font(.system(size: 12, weight: .black))
                            .foregroundStyle(score.tint)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Capsule().fill(score.tint.opacity(0.16)))
                        Text(score.title)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Theme.foreground)
                    }
                    Text(score.detail)
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                        .multilineTextAlignment(.leading)
                }

                Spacer(minLength: 4)

                Image(systemName: isSelected ? "largecircle.fill.circle" : "circle")
                    .font(.system(size: 20))
                    .foregroundStyle(isSelected ? score.tint : Theme.border)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                    .fill(Theme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                    .strokeBorder(isSelected ? score.tint : Theme.border, lineWidth: isSelected ? 1.6 : 1)
            )
        }
        .buttonStyle(PressableStyle())
    }
}

struct MotifChoiceRow: View {
    let label: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: isSelected ? "largecircle.fill.circle" : "circle")
                    .font(.system(size: 18))
                    .foregroundStyle(isSelected ? Theme.primary : Theme.border)
                Text(label)
                    .font(.system(size: 14))
                    .foregroundStyle(Theme.foreground)
                    .multilineTextAlignment(.leading)
                Spacer(minLength: 0)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                    .fill(Theme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                    .strokeBorder(isSelected ? Theme.primary : Theme.border, lineWidth: isSelected ? 1.6 : 1)
            )
        }
        .buttonStyle(PressableStyle())
    }
}

/// Feuille de changement d'étape : choix de la destination et motif.
struct StatusChangeSheet: View {

    @Environment(\.dismiss) private var dismiss

    let steps: [WorkflowStep]
    let currentKey: String
    let onConfirm: (String, String?) async -> Bool

    @State private var target: String = ""
    @State private var reason = ""
    @State private var isWorking = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    FormSection(title: "Nouvelle étape") {
                        VStack(spacing: 8) {
                            ForEach(steps) { step in
                                StepChoiceRow(
                                    step: step,
                                    isCurrent: step.stepKey == currentKey,
                                    isSelected: step.stepKey == target
                                ) {
                                    target = step.stepKey
                                }
                            }
                        }
                    }

                    FormSection(title: "Motif (optionnel)") {
                        LeazrTextArea(
                            placeholder: "Précisez la raison du changement",
                            text: $reason
                        )
                    }

                    PrimaryButton(
                        title: "Confirmer",
                        systemImage: "arrow.right.circle.fill",
                        isLoading: isWorking,
                        isEnabled: !target.isEmpty && target != currentKey
                    ) {
                        Task {
                            isWorking = true
                            let ok = await onConfirm(target, reason.isEmpty ? nil : reason)
                            isWorking = false
                            if ok { dismiss() }
                        }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Changer d'étape")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Annuler") { dismiss() }
                }
            }
        }
    }
}

struct StepChoiceRow: View {
    let step: WorkflowStep
    let isCurrent: Bool
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: isSelected ? "largecircle.fill.circle" : "circle")
                    .font(.system(size: 20))
                    .foregroundStyle(isSelected ? Theme.primary : Theme.border)

                VStack(alignment: .leading, spacing: 2) {
                    Text(step.stepLabel)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(Theme.foreground)

                    if let description = step.stepDescription, !description.isEmpty {
                        Text(description)
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.mutedForeground)
                            .lineLimit(2)
                    }
                }

                Spacer(minLength: 8)

                if isCurrent {
                    Text("Actuelle")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Theme.mutedForeground)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Capsule().fill(Theme.border.opacity(0.5)))
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                    .fill(Theme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                    .strokeBorder(isSelected ? Theme.primary : Theme.border, lineWidth: isSelected ? 1.6 : 1)
            )
        }
        .buttonStyle(PressableStyle())
        .disabled(isCurrent)
        .opacity(isCurrent ? 0.6 : 1)
    }
}
