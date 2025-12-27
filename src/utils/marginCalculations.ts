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
  down_payment?: number | null; // Acompte
}

/**
 * Calculate equipment totals consistently (exact logic extracted from FinancialSection)
 * Returns totalPurchasePrice, totalMonthlyPayment, and totalSellingPrice
 */
export const calculateEquipmentTotals = (offer: OfferFinancialData, equipmentItems?: any[]) => {
  // Utiliser uniquement les équipements passés en paramètre
  const equipmentList = equipmentItems || [];

  // Si on a des équipements parsés, calculer depuis ces données
  if (equipmentList.length > 0) {
    return equipmentList.reduce((acc: any, item: any) => {
      // Utiliser purchasePrice ou purchase_price pour le prix d'achat
      const purchasePrice = parseFloat(item.purchasePrice || item.purchase_price) || 0;
      const quantity = parseInt(item.quantity) || 1;
      // Utiliser monthlyPayment ou monthly_payment pour la mensualité unitaire
      const monthlyPayment = parseFloat(item.monthlyPayment || item.monthly_payment) || 0;
      // Utiliser selling_price si disponible, sinon le calculer via la marge
      const marginPercent = parseFloat(item.margin || item.marginPercent || item.margin_percentage) || 0;
      const explicitSelling = item.selling_price ?? item.sellingPrice;
      const parsedSelling = explicitSelling != null ? parseFloat(explicitSelling) : NaN;
      const sellingPrice = Number.isFinite(parsedSelling) && parsedSelling > 0
        ? parsedSelling
        : (purchasePrice > 0 ? purchasePrice * (1 + marginPercent / 100) : 0);
      
      return {
        totalPurchasePrice: acc.totalPurchasePrice + purchasePrice * quantity,
        // monthly_payment en DB est DÉJÀ le total pour cet équipement (pas unitaire)
        totalMonthlyPayment: acc.totalMonthlyPayment + monthlyPayment,
        totalSellingPrice: acc.totalSellingPrice + sellingPrice * quantity
      };
    }, {
      totalPurchasePrice: 0,
      totalMonthlyPayment: 0,
      totalSellingPrice: 0
    });
  }

  // Fallback: return zeros if no equipment data is available
  return {
    totalPurchasePrice: 0,
    totalMonthlyPayment: offer.monthly_payment || 0,
    totalSellingPrice: 0
  };
};

/**
 * Calculate financed amount from database (deprecated - use getEffectiveFinancedAmount instead)
 */
export const getFinancedAmount = (offer: OfferFinancialData): number => {
  // Utiliser offer.financed_amount en priorité, puis offer.amount comme fallback
  return offer.financed_amount || offer.amount || 0;
};

/**
 * Get effective financed amount - uses inverse Grenke formula
 * Formula: financed_amount = monthly_payment × 100 / coefficient
 */
export const getEffectiveFinancedAmount = (offer: OfferFinancialData, equipmentItems?: any[]): number => {
  const totals = calculateEquipmentTotals(offer, equipmentItems);
  
  // Priorité 1: CALCUL INVERSE GRENKE (mensualité × 100 / coefficient)
  // C'est la méthode utilisée par Grenke pour calculer le montant financé
  if ((offer.coefficient || 0) > 0 && totals.totalMonthlyPayment > 0) {
    const computed = (totals.totalMonthlyPayment * 100) / (offer.coefficient as number);
    return Math.round(computed * 100) / 100; // Arrondi 2 décimales
  }
  
  // Priorité 2: totalSellingPrice depuis les équipements (prix de vente calculé)
  if (totals.totalSellingPrice > 0) {
    return totals.totalSellingPrice;
  }
  
  // Priorité 3: financed_amount depuis l'offre (si mis à jour en base)
  if (offer.financed_amount && offer.financed_amount > 0) {
    return offer.financed_amount;
  }
  
  // Priorité 4: Fallback sur offer.amount
  return offer.amount || 0;
};

/**
 * Get effective financed amount after down payment
 * Subtracts down_payment from the base financed amount
 */
export const getEffectiveFinancedAmountAfterDownPayment = (offer: OfferFinancialData, equipmentItems?: any[]): number => {
  const baseAmount = getEffectiveFinancedAmount(offer, equipmentItems);
  const downPayment = offer.down_payment || 0;
  return Math.max(0, baseAmount - downPayment);
};

/**
 * Calculate adjusted monthly payment after down payment
 * Uses the coefficient to recalculate monthly payment based on reduced financed amount
 */
export const calculateAdjustedMonthlyPayment = (offer: OfferFinancialData, equipmentItems?: any[]): number => {
  const effectiveAmount = getEffectiveFinancedAmountAfterDownPayment(offer, equipmentItems);
  const coefficient = offer.coefficient || 0;
  if (coefficient > 0) {
    return Math.round((effectiveAmount * coefficient) / 100 * 100) / 100;
  }
  return offer.monthly_payment || 0;
};

/**
 * Calculate margin consistently across all components as a percentage
 * Formula: (montant financé - prix d'achat total) / prix d'achat total * 100
 */
export const calculateOfferMargin = (offer: OfferFinancialData, equipmentItems?: any[]): number | null => {
  const totals = calculateEquipmentTotals(offer, equipmentItems);
  
  // Utiliser le montant financé effectif (priorité au totalSellingPrice)
  const financedAmount = getEffectiveFinancedAmount(offer, equipmentItems);

  // Si pas de prix d'achat total, retourner 0
  if (totals.totalPurchasePrice <= 0) {
    return 0;
  }

  // Calculer la marge en pourcentage : (montant financé - prix d'achat total) / prix d'achat total * 100
  const marginPercentage = ((financedAmount - totals.totalPurchasePrice) / totals.totalPurchasePrice) * 100;
  
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
