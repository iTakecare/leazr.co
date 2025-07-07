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
 * Calculate equipment totals consistently (exact logic extracted from FinancialSection)
 */
export const calculateEquipmentTotals = (offer: OfferFinancialData) => {
  // Essayer de parser les équipements depuis equipment_description
  let equipmentList = [];
  if (offer.equipment_description) {
    try {
      const parsedEquipment = JSON.parse(offer.equipment_description);
      if (Array.isArray(parsedEquipment)) {
        equipmentList = parsedEquipment;
      }
    } catch (e) {
      console.warn("Could not parse equipment_description as JSON");
    }
  }

  // Si on a des équipements parsés, calculer depuis ces données
  if (equipmentList.length > 0) {
    return equipmentList.reduce((acc: any, item: any) => {
      // Utiliser purchasePrice ou purchase_price pour le prix d'achat
      const purchasePrice = parseFloat(item.purchasePrice || item.purchase_price) || 0;
      const quantity = parseInt(item.quantity) || 1;
      // Utiliser monthlyPayment ou monthly_payment pour la mensualité
      const monthlyPayment = parseFloat(item.monthlyPayment || item.monthly_payment) || 0;
      return {
        totalPurchasePrice: acc.totalPurchasePrice + purchasePrice * quantity,
        totalMonthlyPayment: acc.totalMonthlyPayment + monthlyPayment * quantity
      };
    }, {
      totalPurchasePrice: 0,
      totalMonthlyPayment: 0
    });
  }

  // Fallback: essayer d'extraire le prix d'achat depuis les données de l'offre
  // Si on n'a pas d'équipements détaillés, utiliser 0 pour éviter les erreurs
  return {
    totalPurchasePrice: 0,
    totalMonthlyPayment: offer.monthly_payment || 0
  };
};

/**
 * Calculate financed amount consistently
 */
export const getFinancedAmount = (offer: OfferFinancialData): number => {
  // Utiliser offer.amount comme montant financé (comme dans FinancialSection)
  return offer.amount || 0;
};

/**
 * Calculate margin consistently across all components
 * Uses the exact same logic as FinancialSection: montant financé (amount) - prix d'achat des équipements
 */
export const calculateOfferMargin = (offer: OfferFinancialData): number | null => {
  const totals = calculateEquipmentTotals(offer);
  
  // Utiliser offer.amount comme montant financé (comme dans FinancialSection)
  const financedAmount = getFinancedAmount(offer);

  // Calculer la marge directement : montant financé - prix d'achat total
  const displayMargin = totals.totalPurchasePrice > 0 ? financedAmount - totals.totalPurchasePrice : 0;
  
  return displayMargin;
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