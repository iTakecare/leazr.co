/**
 * Maps administrative workflow statuses to client-friendly statuses
 */
export const mapWorkflowStatusToClientStatus = (workflowStatus?: string | null, fallbackStatus?: string): string => {
  if (!workflowStatus) {
    return fallbackStatus || 'pending';
  }

  // Map workflow statuses to client statuses
  switch (workflowStatus) {
    case 'draft':
    case 'pending':
      return 'pending';
    
    case 'internal_approved':
    case 'leaser_approved':
    case 'financed':
    case 'contract_sent':
    case 'signed':
      return 'approved';
    
    case 'internal_rejected':
    case 'leaser_rejected':
      return 'rejected';
    
    case 'info_requested':
      return 'pending'; // Still pending from client perspective
    
    default:
      return fallbackStatus || 'pending';
  }
};

/**
 * Determines if an offer has been sent to the client
 */
export const isOfferSent = (workflowStatus?: string | null): boolean => {
  if (!workflowStatus) return false;
  
  return ['contract_sent', 'signed', 'financed'].includes(workflowStatus);
};