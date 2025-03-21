
import { supabase } from "@/integrations/supabase/client";
import { 
  CommissionRate, 
  getCommissionRates as fetchCommissionRates, 
  getDefaultCommissionLevel as fetchDefaultCommissionLevel,
  getAmbassadorCommissionLevel as fetchAmbassadorCommissionLevel 
} from "@/services/commissionService";

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
export const calculateCommissionByLevel = async (amount: number, levelId?: string, type: 'partner' | 'ambassador' = 'partner', ambassadorId?: string): Promise<{ rate: number, amount: number }> => {
  try {
    console.log(`[calculateCommissionByLevel] Starting with amount: ${amount}, levelId: ${levelId}, type: ${type}, ambassadorId: ${ambassadorId}`);
    let actualLevelId = levelId;
    
    // Si un ID d'ambassadeur est fourni, récupérer son niveau de commission
    if (ambassadorId) {
      console.log(`[calculateCommissionByLevel] Ambassador ID provided: ${ambassadorId}, fetching their commission level`);
      const ambassadorLevel = await fetchAmbassadorCommissionLevel(ambassadorId);
      if (ambassadorLevel) {
        actualLevelId = ambassadorLevel.id;
        console.log(`[calculateCommissionByLevel] Using ambassador's commission level: ${actualLevelId}`);
      }
    }
    
    // Si aucun ID de niveau n'est fourni, utiliser le niveau par défaut
    if (!actualLevelId) {
      console.log("[calculateCommissionByLevel] No levelId provided, fetching default level");
      const defaultLevel = await fetchDefaultCommissionLevel(type);
      console.log("[calculateCommissionByLevel] Default level:", defaultLevel);
      actualLevelId = defaultLevel?.id;
    }
    
    // Si toujours pas d'ID, utiliser les taux statiques
    if (!actualLevelId) {
      console.log("[calculateCommissionByLevel] No level available, using static rates");
      const staticRate = getCommissionRate(amount);
      console.log(`[calculateCommissionByLevel] Static rate for amount ${amount}: ${staticRate}%`);
      return {
        rate: staticRate,
        amount: (amount * staticRate) / 100
      };
    }
    
    // Récupérer les taux du niveau de commission
    console.log(`[calculateCommissionByLevel] Fetching rates for level: ${actualLevelId}`);
    const rates = await fetchCommissionRates(actualLevelId);
    console.log("[calculateCommissionByLevel] Commission rates received:", rates);
    
    // Trouver le taux applicable en fonction du montant
    const applicableRate = rates.find(
      rate => amount >= rate.min_amount && amount <= rate.max_amount
    );
    
    if (!applicableRate) {
      console.log(`[calculateCommissionByLevel] No applicable rate found for amount: ${amount}`);
      return {
        rate: 0,
        amount: 0
      };
    }
    
    console.log(`[calculateCommissionByLevel] Found applicable rate: ${applicableRate.rate}%`);
    const calculatedAmount = (amount * applicableRate.rate) / 100;
    console.log(`[calculateCommissionByLevel] Calculated commission amount: ${calculatedAmount}`);
    
    return {
      rate: applicableRate.rate,
      amount: calculatedAmount
    };
  } catch (error) {
    console.error("[calculateCommissionByLevel] Error calculating commission:", error);
    return {
      rate: 0,
      amount: 0
    };
  }
};
