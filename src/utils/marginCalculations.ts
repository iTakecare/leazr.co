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
 * Returns totalPurchasePrice, totalMonthlyPayment, and totalSellingPrice
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
      // Utiliser monthlyPayment ou monthly_payment pour la mensualité (déjà inclut la quantité)
      const monthlyPayment = parseFloat(item.monthlyPayment || item.monthly_payment) || 0;
      // Utiliser selling_price pour le prix de vente
      const sellingPrice = parseFloat(item.selling_price) || 0;
      
      return {
        totalPurchasePrice: acc.totalPurchasePrice + purchasePrice * quantity,
        totalMonthlyPayment: acc.totalMonthlyPayment + monthlyPayment,
        totalSellingPrice: acc.totalSellingPrice + sellingPrice * quantity
      };
    }, {
      totalPurchasePrice: 0,
      totalMonthlyPayment: 0,
      totalSellingPrice: 0
    });
  }

  // Fallback: For client requests, use offer.amount as purchase price
  // For other offers, return 0 to avoid incorrect calculations
  const isClientRequest = offer.type === 'client_request';
  return {
    totalPurchasePrice: isClientRequest ? (offer.amount || 0) : 0,
    totalMonthlyPayment: offer.monthly_payment || 0,
    totalSellingPrice: 0
  };
};

/**
 * Calculate financed amount consistently - prioritizes totalSellingPrice from equipment
 */
export const getFinancedAmount = (offer: OfferFinancialData): number => {
  // Utiliser offer.financed_amount en priorité, puis offer.amount comme fallback
  return offer.financed_amount || offer.amount || 0;
};

/**
 * Get effective financed amount - prioritizes equipment selling price
 */
export const getEffectiveFinancedAmount = (offer: OfferFinancialData, equipmentItems?: any[]): number => {
  const totals = calculateEquipmentTotals(offer, equipmentItems);
  
  // Priorité 1: totalSellingPrice depuis les équipements
  if (totals.totalSellingPrice > 0) {
    return totals.totalSellingPrice;
  }
  
  // Priorité 2: financed_amount ou amount depuis l'offre
  return offer.financed_amount || offer.amount || 0;
};

/**
 * Calculate margin consistently across all components as a percentage
 * Formula: (montant financé - prix d'achat total) / prix d'achat total * 100
 */
export const calculateOfferMargin = (offer: OfferFinancialData, equipmentItems?: any[]): number | null => {
  console.log("🔍 calculateOfferMargin - offer.financed_amount:", offer.financed_amount);
  console.log("🔍 calculateOfferMargin - offer.amount:", offer.amount);
  console.log("🔍 calculateOfferMargin - equipmentItems:", equipmentItems);
  
  const totals = calculateEquipmentTotals(offer, equipmentItems);
  console.log("🔍 calculateOfferMargin - totals:", totals);
  
  // Utiliser le montant financé effectif (priorité au totalSellingPrice)
  const financedAmount = getEffectiveFinancedAmount(offer, equipmentItems);
  console.log("🔍 calculateOfferMargin - effectiveFinancedAmount:", financedAmount);

  // Si pas de prix d'achat total, retourner 0
  if (totals.totalPurchasePrice <= 0) {
    console.log("🔍 calculateOfferMargin - No purchase price, returning 0");
    return 0;
  }

  // Calculer la marge en pourcentage : (montant financé - prix d'achat total) / prix d'achat total * 100
  const marginPercentage = ((financedAmount - totals.totalPurchasePrice) / totals.totalPurchasePrice) * 100;
  console.log("🔍 calculateOfferMargin - marginPercentage calculated:", marginPercentage);
  
  return marginPercentage;
};

/**
 * Format margin for display as percentage
 */
export const formatMarginDisplay = (margin: number | null): string => {
  if (margin === null) {
    return "N/A";
  }
  
  return `${margin.toFixed(2)}%`;
};

/**
 * Calculate margin amount in euros (for components that still need the amount)
 */
export const calculateOfferMarginAmount = (offer: OfferFinancialData, equipmentItems?: any[]): number | null => {
  const totals = calculateEquipmentTotals(offer, equipmentItems);
  const financedAmount = getEffectiveFinancedAmount(offer, equipmentItems);
  
  // Calculer la marge en montant : montant financé - prix d'achat total
  const marginAmount = totals.totalPurchasePrice > 0 ? financedAmount - totals.totalPurchasePrice : 0;
  
  return marginAmount;
};