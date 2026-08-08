import Foundation
import Observation
import SwiftUI
import Supabase

@MainActor
@Observable
final class OpportunityStore {

    private(set) var activities: [CRMActivity] = []
    private(set) var isWorking = false
    var errorMessage: String?

    func loadActivities(opportunityId: String) async {
        activities = (try? await Backend.client
            .from("crm_activities")
            .select(CRMActivity.columns)
            .eq("opportunity_id", value: opportunityId)
            .order("occurred_at", ascending: false)
            .limit(100)
            .execute().value) ?? []
    }

    /// Déplace l'affaire. Le statut, les dates de gain/perte et la trace dans
    /// la timeline sont écrits par les triggers SQL : on n'envoie que
    /// `stage_id`, comme `moveOpportunityToStage` côté web.
    func move(opportunityId: String, to stageId: String) async -> Bool {
        await patch(opportunityId, ["stage_id": .string(stageId)])
    }

    func markLost(
        opportunityId: String,
        lostStageId: String,
        reason: String,
        detail: String?
    ) async -> Bool {
        await patch(opportunityId, [
            "stage_id": .string(lostStageId),
            "lost_reason": .string(reason),
            "lost_reason_detail": detail.map(AnyJSON.string) ?? .null,
        ])
    }

    func setNextAction(
        opportunityId: String,
        at date: Date?,
        channel: String?,
        note: String?
    ) async -> Bool {
        await patch(opportunityId, [
            "next_action_at": date.map { AnyJSON.string(ISO8601DateFormatter.leazrTimestamp.string(from: $0)) } ?? .null,
            "next_action_channel": channel.map(AnyJSON.string) ?? .null,
            "next_action_note": note.map(AnyJSON.string) ?? .null,
        ])
    }

    /// Consigne un échange. `logActivity` du web fixe les mêmes valeurs par
    /// défaut : horodatage courant et direction interne.
    func logActivity(
        opportunityId: String,
        clientId: String?,
        type: String,
        direction: String,
        channel: String?,
        subject: String?,
        body: String?
    ) async -> Bool {
        guard let companyId = await Session.shared.resolve() else { return false }

        isWorking = true
        defer { isWorking = false }

        do {
            try await Backend.client
                .from("crm_activities")
                .insert([
                    "company_id": AnyJSON.string(companyId),
                    "opportunity_id": .string(opportunityId),
                    "client_id": clientId.map(AnyJSON.string) ?? .null,
                    "type": .string(type),
                    "direction": .string(direction),
                    "channel": channel.map(AnyJSON.string) ?? .null,
                    "occurred_at": .string(ISO8601DateFormatter.leazrTimestamp.string(from: Date())),
                    "actor_id": Session.shared.userId.map(AnyJSON.string) ?? .null,
                    "subject": subject.map(AnyJSON.string) ?? .null,
                    "body": body.map(AnyJSON.string) ?? .null,
                ])
                .execute()

            UINotificationFeedbackGenerator().notificationOccurred(.success)
            await loadActivities(opportunityId: opportunityId)
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            errorMessage = "Impossible d'enregistrer l'activité."
            return false
        }
    }

    private func patch(_ id: String, _ values: [String: AnyJSON]) async -> Bool {
        isWorking = true
        defer { isWorking = false }

        do {
            try await Backend.client
                .from("opportunities")
                .update(values)
                .eq("id", value: id)
                .execute()
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            errorMessage = nil
            return true
        } catch {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            errorMessage = "Mise à jour impossible."
            return false
        }
    }
}

// MARK: - Écran

struct OpportunityDetailView: View {

    let opportunity: Opportunity
    let stages: [PipelineStage]
    let onChange: () async -> Void

    @State private var store = OpportunityStore()
    @State private var stageId: String?
    @State private var isMovingStage = false
    @State private var isLogging = false
    @State private var isEditing = false
    @State private var isPlanning = false

    private var currentStage: PipelineStage? {
        stages.first { $0.id == (stageId ?? opportunity.stageId) }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let error = store.errorMessage {
                    ErrorBanner(message: error)
                }

                header
                stagePicker
                clientCard
                nextActionCard

                if let description = opportunity.description, !description.isEmpty {
                    Card {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Contexte")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(Theme.foreground)
                            Text(description)
                                .font(.system(size: 14))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }
                }

                detailsCard
                activitySection
            }
            .padding(20)
            .frame(maxWidth: 700)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle(opportunity.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { isEditing = true } label: {
                    Image(systemName: "square.and.pencil").font(.system(size: 17))
                }
            }
        }
        .sheet(isPresented: $isMovingStage) {
            StageMoveSheet(
                stages: stages,
                currentStageId: stageId ?? opportunity.stageId
            ) { target, reason, detail in
                let ok: Bool
                if target.isLost, let reason {
                    ok = await store.markLost(
                        opportunityId: opportunity.id,
                        lostStageId: target.id,
                        reason: reason,
                        detail: detail
                    )
                } else {
                    ok = await store.move(opportunityId: opportunity.id, to: target.id)
                }
                if ok {
                    stageId = target.id
                    await store.loadActivities(opportunityId: opportunity.id)
                    await onChange()
                }
                return ok
            }
        }
        .sheet(isPresented: $isLogging) {
            LogActivitySheet { type, direction, channel, subject, body in
                let ok = await store.logActivity(
                    opportunityId: opportunity.id,
                    clientId: opportunity.clientId,
                    type: type,
                    direction: direction,
                    channel: channel,
                    subject: subject,
                    body: body
                )
                if ok { await onChange() }
                return ok
            }
        }
        .sheet(isPresented: $isPlanning) {
            NextActionSheet(
                initialDate: opportunity.nextActionAt,
                initialChannel: opportunity.nextActionChannel,
                initialNote: opportunity.nextActionNote
            ) { date, channel, note in
                let ok = await store.setNextAction(
                    opportunityId: opportunity.id,
                    at: date,
                    channel: channel,
                    note: note
                )
                if ok { await onChange() }
                return ok
            }
        }
        .sheet(isPresented: $isEditing) {
            OpportunityFormSheet(stages: stages, existing: opportunity) {
                await onChange()
            }
        }
        .task { await store.loadActivities(opportunityId: opportunity.id) }
        .refreshable { await store.loadActivities(opportunityId: opportunity.id) }
    }

    // MARK: Sections

    private var header: some View {
        HighlightCard(
            label: "Mensualité estimée",
            value: opportunity.estimatedMonthlyPayment.map(Format.currency) ?? "Non estimée",
            tint: currentStage?.color ?? Theme.primary
        )
    }

    private var stagePicker: some View {
        VStack(spacing: 10) {
            Button {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                isMovingStage = true
            } label: {
                HStack(spacing: 10) {
                    Circle()
                        .fill(currentStage?.color ?? Theme.mutedForeground)
                        .frame(width: 10, height: 10)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(currentStage?.label ?? "Sans étape")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Theme.foreground)
                        if let probability = currentStage?.probability {
                            Text("\(probability) % de chances de signer")
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Theme.mutedForeground)
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous)
                        .fill(Theme.surface)
                )
            }
            .buttonStyle(PressableStyle())

            // Barre de progression du pipeline : la position se lit d'un coup.
            HStack(spacing: 3) {
                ForEach(stages) { stage in
                    let reached = (currentStage?.position ?? -1) >= stage.position
                    RoundedRectangle(cornerRadius: 2, style: .continuous)
                        .fill(reached ? stage.color : Theme.border)
                        .frame(height: 5)
                }
            }
        }
    }

    @ViewBuilder
    private var clientCard: some View {
        if let client = opportunity.client {
            Card {
                VStack(alignment: .leading, spacing: 12) {
                    Text(client.company ?? client.name)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Theme.foreground)

                    VStack(spacing: 0) {
                        if client.company != nil {
                            DetailRow(label: "Contact", value: client.name)
                            Divider().overlay(Theme.border)
                        }
                        if let vat = client.vatNumber, !vat.isEmpty {
                            DetailRow(label: "N° d'entreprise", value: vat)
                            Divider().overlay(Theme.border)
                        }
                        if let email = client.email, !email.isEmpty {
                            DetailRow(label: "Email", value: email)
                            Divider().overlay(Theme.border)
                        }
                        if let phone = client.phone, !phone.isEmpty {
                            DetailRow(label: "Téléphone", value: phone)
                            Divider().overlay(Theme.border)
                        }
                        if let address = client.fullAddress {
                            DetailRow(label: "Adresse", value: address)
                        }
                    }

                    ContactActions(
                        phone: client.phone,
                        email: client.email,
                        address: client.fullAddress
                    )
                }
            }
        }
    }

    private var nextActionCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    Image(systemName: opportunity.isOverdue ? "exclamationmark.triangle.fill" : "bell.badge.fill")
                        .font(.system(size: 15))
                        .foregroundStyle(opportunity.isOverdue ? Theme.destructive : Theme.amber)
                    Text("Prochaine action")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Theme.foreground)
                    Spacer()
                }

                if let next = opportunity.nextActionAt {
                    VStack(spacing: 0) {
                        DetailRow(label: "Quand", value: Format.dateTime(next))
                        Divider().overlay(Theme.border)
                        DetailRow(
                            label: "Canal",
                            value: CRMVocabulary.channelLabel(opportunity.nextActionChannel)
                        )
                        if let note = opportunity.nextActionNote, !note.isEmpty {
                            Divider().overlay(Theme.border)
                            DetailRow(label: "Objet", value: note)
                        }
                    }
                } else {
                    Text("Aucune action planifiée. Une affaire sans prochaine étape est une affaire qu'on oublie.")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.mutedForeground)
                }

                HStack(spacing: 10) {
                    ActionButton(
                        title: opportunity.nextActionAt == nil ? "Planifier" : "Modifier",
                        icon: "calendar.badge.plus",
                        tint: Theme.amber
                    ) { isPlanning = true }

                    ActionButton(title: "Consigner", icon: "square.and.pencil", tint: Theme.violet) {
                        isLogging = true
                    }
                }
            }
        }
    }

    private var detailsCard: some View {
        Card {
            VStack(spacing: 0) {
                DetailRow(label: "Statut", value: opportunity.statusLabel)
                Divider().overlay(Theme.border)
                DetailRow(label: "Source", value: CRMVocabulary.sourceLabel(opportunity.source))
                if let amount = opportunity.estimatedAmount, amount > 0 {
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Montant estimé", value: Format.currency(amount))
                }
                if let close = opportunity.expectedCloseDate {
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Clôture espérée", value: Format.date(close))
                }
                if opportunity.status == "lost" {
                    Divider().overlay(Theme.border)
                    DetailRow(
                        label: "Motif de perte",
                        value: CRMVocabulary.lostReasonLabel(opportunity.lostReason)
                    )
                    if let detail = opportunity.lostReasonDetail, !detail.isEmpty {
                        Divider().overlay(Theme.border)
                        DetailRow(label: "Précision", value: detail)
                    }
                }
                if !opportunity.tags.isEmpty {
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Étiquettes", value: opportunity.tags.joined(separator: ", "))
                }
                Divider().overlay(Theme.border)
                DetailRow(label: "Créée le", value: Format.date(opportunity.createdAt))
                if let last = opportunity.lastActivityAt {
                    Divider().overlay(Theme.border)
                    DetailRow(label: "Dernière activité", value: Format.dateTime(last))
                }
            }
        }
    }

    private var activitySection: some View {
        VStack(spacing: 10) {
            SectionHeader(title: "Historique", count: store.activities.count)

            if store.activities.isEmpty {
                EmptyHint(icon: "clock", label: "Aucune activité")
            }

            ForEach(store.activities) { activity in
                Card {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 8) {
                            Image(systemName: activity.icon)
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(width: 26, height: 26)
                                .background(Circle().fill(activity.tint))

                            VStack(alignment: .leading, spacing: 1) {
                                Text(activity.subject ?? activity.typeLabel)
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(Theme.foreground)
                                Text(activity.typeLabel)
                                    .font(.system(size: 11))
                                    .foregroundStyle(Theme.mutedForeground)
                            }

                            Spacer(minLength: 4)

                            Text(Format.date(activity.occurredAt))
                                .font(.system(size: 11))
                                .foregroundStyle(Theme.mutedForeground)
                        }

                        if let body = activity.body, !body.isEmpty {
                            Text(body)
                                .font(.system(size: 13))
                                .foregroundStyle(Theme.mutedForeground)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Changement d'étape

/// Déplacement dans le pipeline. Une étape perdue exige un motif : sans lui, le
/// reporting des pertes ne vaut rien.
struct StageMoveSheet: View {

    @Environment(\.dismiss) private var dismiss

    let stages: [PipelineStage]
    let currentStageId: String?
    let onConfirm: (PipelineStage, String?, String?) async -> Bool

    @State private var target: PipelineStage?
    @State private var lostReason: String?
    @State private var detail = ""
    @State private var isWorking = false

    private var needsReason: Bool { target?.isLost == true }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    FormSection(title: "Nouvelle étape") {
                        VStack(spacing: 8) {
                            ForEach(stages) { stage in
                                StageChoiceRow(
                                    stage: stage,
                                    isCurrent: stage.id == currentStageId,
                                    isSelected: stage.id == target?.id
                                ) {
                                    target = stage
                                    lostReason = nil
                                }
                            }
                        }
                    }

                    if needsReason {
                        FormSection(title: "Motif de la perte") {
                            VStack(spacing: 8) {
                                ForEach(CRMVocabulary.lostReasons, id: \.code) { option in
                                    MotifChoiceRow(
                                        label: option.label,
                                        isSelected: lostReason == option.code
                                    ) { lostReason = option.code }
                                }
                            }
                        }

                        FormSection(title: "Précision (optionnelle)") {
                            LeazrTextArea(placeholder: "Ce qui a fait basculer", text: $detail)
                        }
                    }

                    PrimaryButton(
                        title: "Déplacer",
                        systemImage: "arrow.right.circle.fill",
                        isLoading: isWorking,
                        isEnabled: target != nil
                            && target?.id != currentStageId
                            && (!needsReason || lostReason != nil)
                    ) {
                        guard let target else { return }
                        Task {
                            isWorking = true
                            let ok = await onConfirm(
                                target,
                                lostReason,
                                detail.isEmpty ? nil : detail
                            )
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

struct StageChoiceRow: View {
    let stage: PipelineStage
    let isCurrent: Bool
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        } label: {
            HStack(spacing: 12) {
                Circle().fill(stage.color).frame(width: 11, height: 11)

                VStack(alignment: .leading, spacing: 1) {
                    Text(stage.label)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(Theme.foreground)
                    Text("\(stage.probability) %")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.mutedForeground)
                }

                Spacer(minLength: 8)

                if isCurrent {
                    Text("Actuelle")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Theme.mutedForeground)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Capsule().fill(Theme.border.opacity(0.5)))
                } else {
                    Image(systemName: isSelected ? "largecircle.fill.circle" : "circle")
                        .font(.system(size: 19))
                        .foregroundStyle(isSelected ? stage.color : Theme.border)
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
                    .strokeBorder(isSelected ? stage.color : Theme.border, lineWidth: isSelected ? 1.6 : 1)
            )
        }
        .buttonStyle(PressableStyle())
        .disabled(isCurrent)
        .opacity(isCurrent ? 0.6 : 1)
    }
}

// MARK: - Consigner une activité

struct LogActivitySheet: View {

    @Environment(\.dismiss) private var dismiss
    let onConfirm: (String, String, String?, String?, String?) async -> Bool

    @State private var type = "call"
    @State private var direction = "out"
    @State private var subject = ""
    @State private var note = ""
    @State private var isWorking = false

    /// Un appel ou un e-mail a un sens : reçu ou passé. Une note interne, non.
    private var hasDirection: Bool {
        ["call", "email", "whatsapp", "sms", "meeting"].contains(type)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    FormSection(title: "Type d'échange") {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 100), spacing: 8)], spacing: 8) {
                            ForEach(CRMVocabulary.loggableTypes, id: \.code) { option in
                                SelectChip(
                                    label: option.label,
                                    systemImage: CRMVocabulary.activityIcon(option.code),
                                    isSelected: type == option.code,
                                    tint: CRMVocabulary.activityTint(option.code)
                                ) { type = option.code }
                            }
                        }
                    }

                    if hasDirection {
                        FormSection(title: "Sens") {
                            HStack(spacing: 8) {
                                SelectChip(label: "Sortant", systemImage: "arrow.up.right", isSelected: direction == "out") {
                                    direction = "out"
                                }
                                SelectChip(label: "Entrant", systemImage: "arrow.down.left", isSelected: direction == "in") {
                                    direction = "in"
                                }
                            }
                        }
                    }

                    FormSection(title: "Objet") {
                        LeazrField(
                            icon: "text.alignleft",
                            placeholder: "Ex. relance sur le devis",
                            text: $subject,
                            autocapitalization: .sentences
                        )
                    }

                    FormSection(title: "Détail") {
                        LeazrTextArea(placeholder: "Ce qui s'est dit, ce qui suit…", text: $note)
                    }

                    PrimaryButton(
                        title: "Enregistrer",
                        systemImage: "checkmark.circle.fill",
                        isLoading: isWorking,
                        isEnabled: !subject.trimmingCharacters(in: .whitespaces).isEmpty
                            || !note.trimmingCharacters(in: .whitespaces).isEmpty
                    ) {
                        Task {
                            isWorking = true
                            let ok = await onConfirm(
                                type,
                                hasDirection ? direction : "internal",
                                hasDirection ? type : nil,
                                subject.isEmpty ? nil : subject,
                                note.isEmpty ? nil : note
                            )
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
            .navigationTitle("Consigner un échange")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Annuler") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Prochaine action

struct NextActionSheet: View {

    @Environment(\.dismiss) private var dismiss

    let initialDate: Date?
    let initialChannel: String?
    let initialNote: String?
    let onConfirm: (Date?, String?, String?) async -> Bool

    @State private var date = Date()
    @State private var channel = "call"
    @State private var note = ""
    @State private var isWorking = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    FormSection(title: "Quand") {
                        DatePicker("", selection: $date)
                            .datePickerStyle(.compact)
                            .labelsHidden()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 16)
                            .frame(height: 54)
                            .background(
                                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                    .fill(Theme.surface)
                            )
                    }

                    FormSection(title: "Par quel canal") {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 110), spacing: 8)], spacing: 8) {
                            ForEach(CRMVocabulary.channels, id: \.code) { option in
                                SelectChip(label: option.label, isSelected: channel == option.code) {
                                    channel = option.code
                                }
                            }
                        }
                    }

                    FormSection(title: "Pour faire quoi") {
                        LeazrTextArea(
                            placeholder: "Ex. relancer sur le devis, obtenir le bilan",
                            text: $note
                        )
                    }

                    PrimaryButton(
                        title: "Planifier",
                        systemImage: "calendar.badge.plus",
                        isLoading: isWorking
                    ) {
                        Task {
                            isWorking = true
                            let ok = await onConfirm(date, channel, note.isEmpty ? nil : note)
                            isWorking = false
                            if ok { dismiss() }
                        }
                    }

                    if initialDate != nil {
                        TertiaryButton(title: "Retirer la prochaine action", systemImage: "xmark.circle") {
                            Task {
                                isWorking = true
                                let ok = await onConfirm(nil, nil, nil)
                                isWorking = false
                                if ok { dismiss() }
                            }
                        }
                    }
                }
                .padding(20)
                .frame(maxWidth: 640)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Prochaine action")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Annuler") { dismiss() }
                }
            }
            .onAppear {
                if let initialDate { date = initialDate }
                if let initialChannel { channel = initialChannel }
                if let initialNote { note = initialNote }
            }
        }
    }
}
