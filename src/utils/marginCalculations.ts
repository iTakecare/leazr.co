/**
 * Utility functions for consistent margin calculations across the application
 */

export interface OfferFinancialData {
  margin?: number | null;
  amount?: number | null;
  financed_amount?: number | null;
  monthly_payment?: number | null;
  coefficient?: number | null;
  equipment_description?: string | null;
}

/**
 * Calculate margin consistently across all components
 * Uses the same logic as FinancialSection: montant financé (amount) - prix d'achat des équipements
 */
export const calculateOfferMargin = (offer: OfferFinancialData): number | null => {
  // Calculer le prix d'achat depuis les équipements si disponibles
  let totalPurchasePrice = 0;
  
  if (offer.equipment_description) {
    try {
      const equipmentList = JSON.parse(offer.equipment_description);
      if (Array.isArray(equipmentList)) {
        totalPurchasePrice = equipmentList.reduce((sum: number, item: any) => {
          const purchasePrice = parseFloat(item.purchasePrice || item.purchase_price) || 0;
          const quantity = parseInt(item.quantity) || 1;
          return sum + purchasePrice * quantity;
        }, 0);
      }
    } catch (e) {
      // Si on ne peut pas parser, utiliser fallback
    }
  }
  
  // Utiliser offer.amount comme montant financé (comme dans FinancialSection)
  const financedAmount = Number(offer.amount) || 0;
  
  // Si on a pu calculer le prix d'achat depuis les équipements, calculer la marge
  if (totalPurchasePrice > 0 && financedAmount > 0) {
    return financedAmount - totalPurchasePrice;
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