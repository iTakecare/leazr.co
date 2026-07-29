// Libellés « côté partenaire » des statuts de workflow d'une demande de financement.
export const getPartnerStatusInfo = (
  workflowStatus: string
): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
  switch (workflowStatus) {
    case 'draft':
      return { label: 'Brouillon', variant: 'outline' };
    case 'sent':
      return { label: 'Envoyée', variant: 'secondary' };
    case 'internal_review':
    case 'Scoring_review':
    case 'leaser_review':
      return { label: 'En analyse', variant: 'secondary' };
    case 'internal_docs_requested':
    case 'leaser_docs_requested':
    case 'info_requested':
      return { label: 'Documents demandés', variant: 'outline' };
    case 'internal_approved':
    case 'leaser_approved':
    case 'approved':
    case 'accepted':
    case 'validated':
    case 'financed':
    case 'contract_signed':
      return { label: 'Acceptée', variant: 'default' };
    case 'internal_rejected':
    case 'leaser_rejected':
    case 'rejected':
    case 'client_rejected':
      return { label: 'Refusée', variant: 'destructive' };
    case 'without_follow_up':
      return { label: 'Sans suite', variant: 'outline' };
    default:
      return { label: workflowStatus, variant: 'outline' };
  }
};
