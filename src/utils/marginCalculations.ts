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
  type?: string | null; // Added to identify client requests
}

/**
 * Calculate equipment totals consistently (exact logic extracted from FinancialSection)
 */
export const calculateEquipmentTotals = (offer: OfferFinancialData, equipmentItems?: any[]) => {
  // Utiliser les équipements passés en paramètre ou fallback sur equipment_description
  let equipmentList = equipmentItems || [];
  
  if (!equipmentList.length && offer.equipment_description) {
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

  // Fallback: For client requests, use offer.amount as purchase price
  // For other offers, return 0 to avoid incorrect calculations
  const isClientRequest = offer.type === 'client_request';
  return {
    totalPurchasePrice: isClientRequest ? (offer.amount || 0) : 0,
    totalMonthlyPayment: offer.monthly_payment || 0
  };
};

/**
 * Calculate financed amount consistently
 */
export const getFinancedAmount = (offer: OfferFinancialData): number => {
  // Utiliser offer.financed_amount en priorité, puis offer.amount comme fallback
  return offer.financed_amount || offer.amount || 0;
};

/**
 * Calculate margin consistently across all components
 * Uses the exact same logic as FinancialSection: montant financé (amount) - prix d'achat des équipements
 */
export const calculateOfferMargin = (offer: OfferFinancialData, equipmentItems?: any[]): number | null => {
  console.log("🔍 calculateOfferMargin - offer.financed_amount:", offer.financed_amount);
  console.log("🔍 calculateOfferMargin - offer.amount:", offer.amount);
  console.log("🔍 calculateOfferMargin - equipmentItems:", equipmentItems);
  
  const totals = calculateEquipmentTotals(offer, equipmentItems);
  console.log("🔍 calculateOfferMargin - totals:", totals);
  
  // Utiliser offer.financed_amount en priorité pour le calcul de marge
  const financedAmount = getFinancedAmount(offer);
  console.log("🔍 calculateOfferMargin - financedAmount:", financedAmount);

  // Calculer la marge directement : montant financé - prix d'achat total
  const displayMargin = totals.totalPurchasePrice > 0 ? financedAmount - totals.totalPurchasePrice : 0;
  console.log("🔍 calculateOfferMargin - displayMargin calculated:", displayMargin);
  
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