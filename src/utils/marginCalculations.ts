/**
 * Utility functions for consistent margin calculations across the application
 */

export interface OfferFinancialData {
  margin?: number | null;
  amount?: number | null;
  financed_amount?: number | null;
  monthly_payment?: number | null;
  coefficient?: number | null;
}

/**
 * Calculate margin consistently across all components
 * Priority: financed_amount - amount, then fallback to offer.margin
 */
export const calculateOfferMargin = (offer: OfferFinancialData): number | null => {
  // Primary calculation: financed_amount - amount (same as FinancialSection)
  if (offer.amount !== null && offer.amount !== undefined && 
      offer.financed_amount !== null && offer.financed_amount !== undefined) {
    const amount = Number(offer.amount);
    const financedAmount = Number(offer.financed_amount);
    
    if (!isNaN(amount) && !isNaN(financedAmount)) {
      return financedAmount - amount;
    }
  }

  // Fallback: use offer.margin if available
  if (offer.margin !== null && offer.margin !== undefined && !isNaN(Number(offer.margin))) {
    return Number(offer.margin);
  }

  return null;
};

/**
 * Format margin for display
 */
export const formatMarginDisplay = (margin: number | null): string => {
  if (margin === null) {
    return "N/A";
  }
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(margin);
};