
import { supabase } from "@/integrations/supabase/client";
import { getCommissionRates, getDefaultCommissionLevel } from "@/services/commissionService";

// Leasing coefficients (Grenke)
export const leasingCoefficients = [
  { min: 25000.01, max: 50000, rate: 3.16 },
  { min: 12500.01, max: 25000, rate: 3.17 },
  { min: 5000.01, max: 12500, rate: 3.18 },
  { min: 2500.01, max: 5000, rate: 3.28 },
  { min: 500, max: 2500, rate: 3.64 },
];

// Gardons les taux statiques pour la rétrocompatibilité
export const commissionRates = [
  { min: 25000.01, max: 50000, rate: 25 },
  { min: 12500.01, max: 25000, rate: 21 },
  { min: 5000.01, max: 12500, rate: 18 },
  { min: 2500.01, max: 5000, rate: 13 },
  { min: 500, max: 2500, rate: 10 },
];

/**
 * Calculate monthly leasing payment
 * Formula: Amount * Coefficient / 100 = Monthly payment
 */
export const calculateMonthlyLeasing = (amount: number): number => {
  const coefficient = leasingCoefficients.find(
    (c) => amount >= c.min && amount <= c.max
  );
  
  if (!coefficient) return 0;
  
  return (amount * coefficient.rate) / 100;
};

/**
 * Calculate partner commission amount
 */
export const calculateCommission = (amount: number): number => {
  const commissionRate = commissionRates.find(
    (c) => amount >= c.min && amount <= c.max
  );
  
  if (!commissionRate) return 0;
  
  return (amount * commissionRate.rate) / 100;
};

/**
 * Get coefficient rate based on amount
 */
export const getCoefficientRate = (amount: number): number => {
  const coefficient = leasingCoefficients.find(
    (c) => amount >= c.min && amount <= c.max
  );
  
  return coefficient?.rate || 0;
};

/**
 * Get commission rate based on amount
 */
export const getCommissionRate = (amount: number): number => {
  const commissionRate = commissionRates.find(
    (c) => amount >= c.min && amount <= c.max
  );
  
  return commissionRate?.rate || 0;
};

/**
 * Calculate commission based on amount and commission level
 */
export const calculateCommissionByLevel = async (amount: number, levelId?: string, type: 'partner' | 'ambassador' = 'partner'): Promise<{ rate: number, amount: number }> => {
  try {
    let actualLevelId = levelId;
    
    // Si aucun ID de niveau n'est fourni, utiliser le niveau par défaut
    if (!actualLevelId) {
      const defaultLevel = await getDefaultCommissionLevel(type);
      actualLevelId = defaultLevel?.id;
    }
    
    // Si toujours pas d'ID, utiliser les taux statiques
    if (!actualLevelId) {
      const staticRate = getCommissionRate(amount);
      return {
        rate: staticRate,
        amount: (amount * staticRate) / 100
      };
    }
    
    // Récupérer les taux du niveau de commission
    const rates = await getCommissionRates(actualLevelId);
    
    // Trouver le taux applicable en fonction du montant
    const applicableRate = rates.find(
      rate => amount >= rate.min_amount && amount <= rate.max_amount
    );
    
    if (!applicableRate) {
      return {
        rate: 0,
        amount: 0
      };
    }
    
    return {
      rate: applicableRate.rate,
      amount: (amount * applicableRate.rate) / 100
    };
  } catch (error) {
    console.error("Error calculating commission by level:", error);
    return {
      rate: 0,
      amount: 0
    };
  }
};
