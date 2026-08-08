import SwiftUI

/// Vocabulaire des statuts d'offre, repris de `OfferStatusBadge.tsx` et de
/// `LeazrWorkflowStepper.tsx`.
///
/// Le point clé — et la cause du bandeau vide dans la timeline — est que le
/// `workflow_status` stocké n'est pas toujours une étape du modèle. Les
/// sous-statuts (`internal_docs_requested`, `leaser_rejected`…) vivent *dans*
/// une étape (`internal_review`, `leaser_review`). Le web résout cela avec une
/// table de correspondance ; on la reproduit ici à l'identique.
enum OfferStatus {

    // MARK: - Libellés

    private static let labels: [String: String] = [
        "draft": "Brouillon",
        "sent": "Offre envoyée",
        "offer_send": "Offre envoyée",
        "offer_sent": "Offre envoyée",

        "internal_review": "Analyse interne",
        "internal_scoring": "Analyse interne",
        "internal_approved": "Validée interne",
        "internal_docs_requested": "Docs interne",
        "internal_rejected": "Rejet interne",

        "leaser_review": "Analyse leaser",
        "leaser_introduced": "Intro. leaser",
        "leaser_sent": "Intro. leaser",
        "leaser_scoring": "Score leaser",
        "Scoring_review": "Score leaser",
        "score_leaser": "Score leaser",
        "leaser_approved": "Validé leaser",
        "leaser_accepted": "Validé leaser",
        "leaser_docs_requested": "Docs leaser",
        "leaser_rejected": "Rejet leaser",

        "client_review": "Revue client",
        "client_approved": "Acceptée client",
        "offer_accepted": "Offre acceptée",
        "client_rejected": "Rejet client",

        "validated": "Contrat prêt",
        "contract_ready": "Contrat prêt",
        "contrat_pret": "Contrat prêt",
        "contract_sent": "Contrat envoyé",
        "contract_signed": "Acceptée",
        "signed": "Signée",
        "financed": "Financée",
        "invoicing": "Facturé",

        "approved": "Approuvée",
        "accepted": "Acceptée",
        "rejected": "Rejetée",
        "pending": "En attente",
        "info_requested": "Infos demandées",
        "valid_itc": "Validée ITC",
        "without_follow_up": "Sans suite",
    ]

    /// Libellé français d'un statut. Repli lisible pour tout code inconnu :
    /// jamais de `snake_case` brut à l'écran.
    static func label(_ key: String?) -> String {
        guard let key, !key.isEmpty else { return "Brouillon" }
        if let known = labels[key] { return known }
        return key.replacingOccurrences(of: "_", with: " ").capitalized
    }

    // MARK: - Couleurs

    /// Couleur d'accompagnement, alignée sur les classes Tailwind du web :
    /// vert = validé, rouge = refusé, ambre = en attente d'une action,
    /// bleu = en circulation, gris = neutre.
    static func tint(_ key: String?) -> Color {
        guard let key, !key.isEmpty else { return Theme.mutedForeground }

        switch key {
        case "internal_approved", "leaser_approved", "leaser_accepted",
             "client_approved", "offer_accepted", "accepted", "approved",
             "financed", "invoicing", "signed", "contract_signed":
            return Theme.emerald

        case "internal_rejected", "leaser_rejected", "client_rejected", "rejected":
            return Theme.destructive

        case "internal_docs_requested", "leaser_docs_requested", "info_requested", "pending":
            return Theme.amber

        case "sent", "offer_send", "offer_sent", "client_review",
             "validated", "contract_ready", "contrat_pret", "contract_sent":
            return Theme.sky

        case "internal_review", "internal_scoring", "leaser_review",
             "leaser_introduced", "leaser_sent", "leaser_scoring",
             "Scoring_review", "score_leaser", "valid_itc":
            return Theme.violet

        case "without_follow_up", "draft":
            return Theme.mutedForeground

        // Statuts partagés par les contrats, documents, tickets et factures :
        // le badge est le même composant partout, la palette doit suivre.
        case "equipment_ordered", "processing", "in_progress":
            return Theme.sky
        case "delivered", "active", "completed", "analyzed", "resolved", "answered":
            return Theme.emerald
        case "failed", "error", "no_answer", "urgent":
            return Theme.destructive
        case "open", "high":
            return Theme.amber
        case "closed", "voicemail", "busy":
            return Theme.mutedForeground

        default:
            return Theme.mutedForeground
        }
    }

    /// Icône SF Symbols correspondant au statut.
    static func icon(_ key: String?) -> String {
        guard let key else { return "circle" }
        switch key {
        case "draft":                                        return "pencil"
        case "sent", "offer_send", "offer_sent":             return "paperplane.fill"
        case "internal_review", "internal_scoring":          return "magnifyingglass"
        case "leaser_review", "leaser_introduced", "leaser_sent":
            return "building.columns.fill"
        case "leaser_scoring", "Scoring_review", "score_leaser":
            return "chart.bar.fill"
        case "internal_approved", "leaser_approved", "leaser_accepted",
             "client_approved", "offer_accepted", "accepted", "approved":
            return "checkmark.circle.fill"
        case "internal_docs_requested", "leaser_docs_requested", "info_requested":
            return "doc.text.fill"
        case "internal_rejected", "leaser_rejected", "client_rejected", "rejected":
            return "xmark.circle.fill"
        case "validated", "contract_ready", "contrat_pret":  return "doc.badge.checkmark"
        case "contract_sent":                                return "envelope.fill"
        case "signed", "contract_signed":                    return "signature"
        case "financed":                                     return "banknote.fill"
        case "invoicing":                                    return "receipt.fill"
        case "without_follow_up":                            return "person.slash.fill"
        default:                                             return "clock"
        }
    }

    // MARK: - Correspondance statut → étape du workflow

    /// Table reprise telle quelle de `getCurrentStepIndex()` dans
    /// `LeazrWorkflowStepper.tsx`.
    private static let stepMapping: [String: String] = [
        "internal_approved": "internal_review",
        "internal_docs_requested": "internal_review",
        "internal_rejected": "internal_review",
        "internal_scoring": "internal_review",
        "leaser_approved": "leaser_review",
        "leaser_docs_requested": "leaser_review",
        "leaser_rejected": "leaser_review",
        "leaser_scoring": "leaser_review",
        "leaser_sent": "leaser_introduced",
        "leaser_accepted": "leaser_review",
        "Scoring_review": "leaser_review",
        "score_leaser": "leaser_review",
        "accepted": "leaser_review",
        "offer_send": "offer_send",
        "offer_sent": "offer_send",
        "client_approved": "client_approved",
        "offer_accepted": "offer_accepted",
        "offer_validation": "validated",
        "validated": "validated",
        "contract_ready": "validated",
        "contrat_pret": "validated",
        "financed": "validated",
        "invoicing": "invoicing",
        "draft": "draft",
        "sent": "offer_send",
        "leaser_introduced": "leaser_introduced",
    ]

    /// Index de l'étape courante dans un modèle de workflow, avec la même
    /// cascade de replis que le web : clé exacte → table de correspondance →
    /// inclusion mutuelle → famille (`internal` / `leaser`).
    ///
    /// Renvoie `nil` seulement si le modèle est vide ; sinon on retombe sur la
    /// première étape, comme le web, pour ne jamais afficher une timeline morte.
    static func stepIndex(for status: String, in steps: [WorkflowStep]) -> Int? {
        guard !steps.isEmpty else { return nil }

        if let exact = steps.firstIndex(where: { $0.stepKey == status }) { return exact }

        if let mapped = stepMapping[status],
           let index = steps.firstIndex(where: { $0.stepKey == mapped }) {
            return index
        }

        if let loose = steps.firstIndex(where: {
            !$0.stepKey.isEmpty && ($0.stepKey.contains(status) || status.contains($0.stepKey))
        }) { return loose }

        if status.contains("internal"),
           let scoring = steps.firstIndex(where: { $0.scoringType == "internal" }) {
            return scoring
        }
        if status.contains("leaser"),
           let scoring = steps.firstIndex(where: { $0.scoringType == "leaser" }) {
            return scoring
        }

        return 0
    }

    /// Vrai quand le statut courant est un sous-statut : l'étape ne suffit alors
    /// pas à décrire la situation, il faut afficher les deux.
    static func isSubStatus(_ status: String, of step: WorkflowStep) -> Bool {
        status != step.stepKey
    }
}

// MARK: - Onglets de la liste

/// Onglets de filtrage des demandes, repris de `useOfferFilters.ts`. Les
/// ensembles de statuts sont copiés à l'identique : un dossier doit apparaître
/// dans le même onglet sur mobile et sur le web.
enum OfferTab: String, CaseIterable, Identifiable {
    case inProgress
    case accepted
    case invoiced
    case withoutFollowUp
    case rejected

    var id: String { rawValue }

    var title: String {
        switch self {
        case .inProgress:      return "À traiter"
        case .accepted:        return "Acceptées"
        case .invoiced:        return "Facturées"
        case .withoutFollowUp: return "Sans suite"
        case .rejected:        return "Refusées"
        }
    }

    var tint: Color {
        switch self {
        case .inProgress:      return Theme.primary
        case .accepted:        return Theme.emerald
        case .invoiced:        return Theme.teal
        case .withoutFollowUp: return Theme.mutedForeground
        case .rejected:        return Theme.destructive
        }
    }

    private static let acceptedStatuses: Set<String> = [
        "accepted", "validated", "financed", "contract_sent", "signed", "contract_signed",
    ]
    private static let invoicedStatuses: Set<String> = ["invoicing"]
    private static let withoutFollowUpStatuses: Set<String> = ["without_follow_up"]
    private static let rejectedStatuses: Set<String> = [
        "internal_rejected", "leaser_rejected", "rejected", "client_rejected",
    ]

    /// Le web filtre sur `workflow_status` seul — pas sur `status`. Se caler
    /// dessus évite qu'un dossier bascule d'onglet entre les deux applications.
    func matches(_ offer: Offer) -> Bool {
        let status = (offer.workflowStatus ?? "").trimmingCharacters(in: .whitespaces).lowercased()

        switch self {
        case .accepted:        return Self.acceptedStatuses.contains(status)
        case .invoiced:        return Self.invoicedStatuses.contains(status)
        case .withoutFollowUp: return Self.withoutFollowUpStatuses.contains(status)
        case .rejected:        return Self.rejectedStatuses.contains(status)
        case .inProgress:
            return !Self.acceptedStatuses.contains(status)
                && !Self.invoicedStatuses.contains(status)
                && !Self.withoutFollowUpStatuses.contains(status)
                && !Self.rejectedStatuses.contains(status)
        }
    }
}

/// Type de demande, aligné sur le sélecteur « Type » du web.
enum OfferTypeFilter: String, CaseIterable, Identifiable {
    case all = "all"
    case adminOffer = "admin_offer"
    case clientRequest = "client_request"
    case webRequest = "web_request"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .all:           return "Tous types"
        case .adminOffer:    return "Mes demandes"
        case .clientRequest: return "Demandes clients"
        case .webRequest:    return "Demandes web"
        }
    }
}

/// Source de la demande, aligné sur le sélecteur « Source » du web.
enum OfferSourceFilter: String, CaseIterable, Identifiable {
    case all = "all"
    case meta = "meta"
    case customPack = "custom_pack"
    case webCatalog = "web_catalog"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .all:        return "Toutes sources"
        case .meta:       return "Meta Ads"
        case .customPack: return "Packs perso."
        case .webCatalog: return "Catalogue"
        }
    }
}

/// Motifs de refus (`offers.rejection_category`) et de classement sans suite
/// (`offer_workflow_logs.sub_reason`), repris de `OffersFilter.tsx`.
enum OfferMotif {

    static let rejection: [(code: String, label: String)] = [
        ("fraud", "Suspect / fraude"),
        ("young_company", "Entreprise trop jeune / montant"),
        ("private_client", "Client particulier"),
        ("financial_situation", "Situation financière"),
        ("other", "Autre raison"),
        ("unknown", "Sans motif renseigné"),
    ]

    static let noFollowUp: [(code: String, label: String)] = [
        ("no_response", "Plus de nouvelles après relances"),
        ("project_postponed", "Projet reporté par le client"),
        ("went_competitor", "Parti chez un concurrent"),
        ("budget_issue", "Problème de budget"),
        ("project_cancelled", "Projet annulé"),
        ("other", "Autre raison"),
        ("unknown", "Sans motif renseigné"),
    ]

    static func rejectionLabel(_ code: String?) -> String {
        rejection.first { $0.code == (code ?? "unknown") }?.label ?? "Sans motif renseigné"
    }

    static func noFollowUpLabel(_ code: String?) -> String {
        noFollowUp.first { $0.code == (code ?? "unknown") }?.label ?? "Sans motif renseigné"
    }
}
