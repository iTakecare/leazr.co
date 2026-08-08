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
    private(set) var signature: OfferSignature?
    private(set) var commission: Commission?
    private(set) var isWorking = false
    var errorMessage: String?

    /// Commission du dossier, telle que l'affiche `OfferCommissionCard`.
    struct Commission: Decodable, Sendable {
        let amount: Double
        let status: String?

        enum CodingKeys: String, CodingKey {
            case amount = "commission"
            case status = "commission_status"
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            amount = try c.decodeIfPresent(Double.self, forKey: .amount) ?? 0
            status = try c.decodeIfPresent(String.self, forKey: .status)
        }
    }

    func load(offerId: String) async {
        async let e: Void = loadEquipment(offerId)
        async let d: Void = loadDocuments(offerId)
        async let c: Void = loadCalls(offerId)
        async let s: Void = loadSignature(offerId)
        async let m: Void = loadCommission(offerId)
        _ = await (e, d, c, s, m)
    }

    private func loadCommission(_ offerId: String) async {
        let rows: [Commission] = (try? await Backend.client
            .from("offers")
            .select("commission, commission_status")
            .eq("id", value: offerId)
            .limit(1)
            .execute().value) ?? []
        commission = rows.first
    }

    /// Les traces de signature ne sont pas dans la liste : elles sont lourdes
    /// (l'image en base64) et n'ont d'intérêt qu'ouvert sur le dossier.
    func loadSignature(_ offerId: String) async {
        let rows: [OfferSignature] = (try? await Backend.client
            .from("offers")
            .select(OfferSignature.columns)
            .eq("id", value: offerId)
            .limit(1)
            .execute().value) ?? []
        signature = rows.first
    }

    private func loadEquipment(_ offerId: String) async {
        equipment = (try? await Backend.client
            .from("offer_equipment")
            .select(OfferEquipment.columns)
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
    @State private var isSigning = false
    @State private var isRequestingDocuments = false
    @State private var currentStatus: String = ""
    @State private var logs: [WorkflowLog] = []
    @State private var transitionNote: String?

    /// Huit sections valent mieux qu'un écran interminable : le segmenté
    /// devient une barre défilante, chacune ne charge que ce qui la concerne.
    enum Section: String, CaseIterable, Identifiable {
        case summary = "Résumé"
        case actions = "Actions"
        case documents = "Documents"
        case signature = "Signature"
        case notes = "Notes"
        case analysis = "Analyse"
        case leaser = "Bailleur"
        case calls = "Appels"

        var id: String { rawValue }

        var icon: String {
            switch self {
            case .summary:   return "doc.text"
            case .actions:   return "bolt.fill"
            case .documents: return "paperclip"
            case .signature: return "signature"
            case .notes:     return "note.text"
            case .analysis:  return "chart.pie"
            case .leaser:    return "building.columns"
            case .calls:     return "phone"
            }
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let error = store.errorMessage {
                    ErrorBanner(message: error)
                }

                if let transitionNote {
                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.circle.fill").font(.system(size: 14))
                        Text(transitionNote).font(.system(size: 13, weight: .medium))
                        Spacer(minLength: 0)
                    }
                    .foregroundStyle(Theme.emerald)
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(Theme.emerald.opacity(0.12))
                    )
                }

                HighlightCard(
                    label: "Mensualité",
                    value: Format.currency(offer.monthlyPayment),
                    tint: Theme.primary
                )

                sectionBar

                switch section {
                case .summary:   summarySection
                case .actions:
                    OfferActionsSection(offer: offer, signature: store.signature) {
                        await store.load(offerId: offer.id)
                        logs = await workflow.loadLogs(offerId: offer.id)
                    }
                case .documents: documentsSection
                case .signature: signatureSection
                case .notes:     OfferNotesSection(offerId: offer.id)
                case .analysis:  analysisSection
                case .leaser:    GrenkePanel(offer: offer, documents: store.documents)
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
                let result = await OfferStatusService.update(
                    offerId: offer.id,
                    to: newStatus,
                    from: effectiveStatus,
                    reason: reason
                )
                guard let result else { return false }

                // Une étape finale convertit la demande en contrat côté
                // serveur : le statut réel devient « financed », pas celui
                // qu'on a demandé.
                currentStatus = result.contractId == nil ? newStatus : "financed"
                await refreshAfterTransition(result)
                return true
            }
        }
        .sheet(isPresented: $isScoring) {
            if let scoringStep {
                ScoringSheet(step: scoringStep, offer: offer) { outcome in
                    let result = await OfferStatusService.update(
                        offerId: offer.id,
                        to: outcome.targetStatus,
                        from: effectiveStatus,
                        reason: outcome.reason,
                        options: .init(
                            rejectionCategory: outcome.rejectionCategory,
                            subReason: outcome.subReason
                        )
                    )
                    guard let result else { return false }

                    currentStatus = outcome.targetStatus
                    await refreshAfterTransition(result)
                    return true
                }
            }
        }
        .sheet(isPresented: $isSigning) {
            SignatureSheet(offer: offer) {
                // La signature bascule le dossier en « approved » côté serveur :
                // l'écran doit refléter ce nouvel état sans rechargement manuel.
                currentStatus = "approved"
                await store.loadSignature(offer.id)
                logs = await workflow.loadLogs(offerId: offer.id)
                section = .signature
            }
        }
        .sheet(isPresented: $isRequestingDocuments) {
            DocumentRequestSheet(offerId: offer.id) {
                await store.load(offerId: offer.id)
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

    /// Recharge ce qu'une transition a pu modifier, et rend compte de ses
    /// effets de bord — un contrat créé ou du stock relibéré doit se voir.
    private func refreshAfterTransition(_ result: OfferStatusService.Result) async {
        logs = await workflow.loadLogs(offerId: offer.id)
        await store.load(offerId: offer.id)

        var notes: [String] = []
        if result.contractId != nil { notes.append("Contrat créé") }
        if result.assigned > 0 { notes.append("\(result.assigned) matériel(s) assigné(s)") }
        if result.released > 0 { notes.append("\(result.released) matériel(s) relibéré(s)") }
        transitionNote = notes.isEmpty ? nil : notes.joined(separator: " · ")
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
            PrimaryButton(title: "Demander des documents", systemImage: "paperplane.fill") {
                isRequestingDocuments = true
            }

            if store.documents.isEmpty {
                EmptyHint(icon: "doc.on.doc", label: "Aucun document reçu")
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

    /// Barre de sections défilante, avec la pastille des documents en attente.
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
                            if item == .documents, store.pendingDocuments > 0 {
                                Text("\(store.pendingDocuments)")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundStyle(isActive ? Theme.primary : .white)
                                    .padding(.horizontal, 5)
                                    .padding(.vertical, 1)
                                    .background(
                                        Capsule().fill(isActive ? Color.white : Theme.amber)
                                    )
                            }
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

    // MARK: - Analyse

    private var analysisSection: some View {
        VStack(spacing: 14) {
            OfferAISummaryCard(offerId: offer.id)
            FinancingAnalysisCard(offer: offer)

            if let commission = store.commission, commission.amount > 0 {
                OfferCommissionCard(commission: commission.amount, status: commission.status)
            }

            ExternalServicesSection(offerId: offer.id)

            SectionHeader(title: "E-mails liés")
            LinkedEmailsSection(offerId: offer.id)
        }
    }

    // MARK: - Signature

    /// Deux chemins vers la signature : à distance par le lien envoyé au
    /// client, ou en présence avec l'iPad tendu au client. Le second est ce que
    /// le web ne sait pas faire.
    private var signatureSection: some View {
        VStack(spacing: 14) {
            if let signature = store.signature, signature.isSigned {
                SignatureCard(signature: signature)
            } else {
                Card {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(spacing: 8) {
                            Image(systemName: "signature")
                                .font(.system(size: 16))
                                .foregroundStyle(Theme.violet)
                            Text("Offre non signée")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(Theme.foreground)
                            Spacer()
                        }
                        Text("Faites signer le client sur l'appareil, ou envoyez-lui le lien de signature.")
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.mutedForeground)
                    }
                }

                PrimaryButton(title: "Faire signer maintenant", systemImage: "signature") {
                    isSigning = true
                }
            }

            SectionHeader(title: "Lien de signature", count: nil)

            if let link = SignatureStore.link(offerId: offer.id) {
                Card {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(link.absoluteString)
                            .font(.system(size: 12, design: .monospaced))
                            .foregroundStyle(Theme.mutedForeground)
                            .lineLimit(2)
                            .textSelection(.enabled)

                        HStack(spacing: 10) {
                            ActionButton(title: "Copier", icon: "doc.on.doc", tint: Theme.sky) {
                                UIPasteboard.general.string = link.absoluteString
                                UINotificationFeedbackGenerator().notificationOccurred(.success)
                            }

                            ShareLink(item: link) {
                                HStack(spacing: 6) {
                                    Image(systemName: "square.and.arrow.up")
                                        .font(.system(size: 13, weight: .bold))
                                    Text("Partager").font(.system(size: 14, weight: .semibold))
                                }
                                .foregroundStyle(Theme.violet)
                                .frame(maxWidth: .infinity)
                                .frame(height: 40)
                                .background(
                                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                                        .fill(Theme.violet.opacity(0.13))
                                )
                            }
                        }

                        // Le client relit l'offre exactement comme il la verra :
                        // c'est la page publique, pas une reconstitution.
                        Link(destination: link) {
                            HStack(spacing: 6) {
                                Image(systemName: "safari")
                                    .font(.system(size: 13, weight: .bold))
                                Text("Ouvrir la page client")
                                    .font(.system(size: 14, weight: .semibold))
                            }
                            .foregroundStyle(Theme.primary)
                            .frame(maxWidth: .infinity)
                            .frame(height: 40)
                            .background(
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .fill(Theme.primary.opacity(0.13))
                            )
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
