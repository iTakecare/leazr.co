
import { supabase } from "@/integrations/supabase/client";
import { 
  CommissionRate, 
  getCommissionRates as fetchCommissionRates, 
  getDefaultCommissionLevel as fetchDefaultCommissionLevel,
  getAmbassadorCommissionLevel as fetchAmbassadorCommissionLevel,
  getCommissionLevelWithRates
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

// Cache for commission calculations to avoid repeated API calls and calculations
const commissionCache = new Map();
// TTL for cache entries (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

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
export const calculateCommissionByLevel = async (amount: number, levelId?: string, type: 'partner' | 'ambassador' = 'partner', ambassadorId?: string): Promise<{ rate: number, amount: number, levelName?: string }> => {
  try {
    // Create a unique cache key for this combination of parameters
    const cacheKey = `${amount}-${levelId}-${type}-${ambassadorId}`;
    
    // Check if we have a valid cached result
    const cachedItem = commissionCache.get(cacheKey);
    if (cachedItem && cachedItem.timestamp && (Date.now() - cachedItem.timestamp < CACHE_TTL)) {
      return cachedItem.value;
    }
    
    console.log(`[calculateCommissionByLevel] Starting with amount: ${amount}, levelId: ${levelId}, type: ${type}, ambassadorId: ${ambassadorId}`);
    let actualLevelId = levelId;
    let levelName: string | undefined;
    
    // If an ambassador ID is provided, get their commission level directly from the database
    if (ambassadorId) {
      console.log(`[calculateCommissionByLevel] Ambassador ID provided: ${ambassadorId}, fetching their commission level from database`);
      
      // Get the ambassador record with commission_level_id directly from the database to ensure we have the latest data
      const { data: ambassador, error: ambassadorError } = await supabase
        .from('ambassadors')
        .select('commission_level_id, name')
        .eq('id', ambassadorId)
        .single();
      
      if (!ambassadorError && ambassador && ambassador.commission_level_id) {
        actualLevelId = ambassador.commission_level_id;
      }
    }

    // If no level ID is provided, use the default level
    if (!actualLevelId) {
      console.log("[calculateCommissionByLevel] No levelId provided, fetching default level");
      const defaultLevel = await fetchDefaultCommissionLevel(type);
      console.log("[calculateCommissionByLevel] Default level:", defaultLevel);
      
      if (defaultLevel) {
        actualLevelId = defaultLevel.id;
        levelName = defaultLevel.name;
      }
    }
    
    // If still no ID, use static rates
    if (!actualLevelId) {
      console.log("[calculateCommissionByLevel] No level available, using static rates");
      const staticRate = getCommissionRate(amount);
      console.log(`[calculateCommissionByLevel] Static rate for amount ${amount}: ${staticRate}%`);
      
      const result = {
        rate: staticRate,
        amount: (amount * staticRate) / 100
      };
      
      // Cache the result
      commissionCache.set(cacheKey, { 
        value: result,
        timestamp: Date.now()
      });
      
      return result;
    }
    
    // Get commission rates for the level
    console.log(`[calculateCommissionByLevel] Fetching rates for level: ${actualLevelId}`);
    
    // Get full level with rates
    const level = await getCommissionLevelWithRates(actualLevelId);
    console.log("[calculateCommissionByLevel] Commission level with rates:", level);
    
    if (!level || !level.rates || level.rates.length === 0) {
      console.log("[calculateCommissionByLevel] No rates found for level, fetching separately");
      const rates = await fetchCommissionRates(actualLevelId);
      
      // Find applicable rate based on amount
      const applicableRate = rates.find(
        rate => amount >= rate.min_amount && amount <= rate.max_amount
      );
      
      if (!applicableRate) {
        console.log(`[calculateCommissionByLevel] No applicable rate found for amount: ${amount}`);
        const result = {
          rate: 0,
          amount: 0,
          levelName
        };
        
        // Cache the result
        commissionCache.set(cacheKey, {
          value: result,
          timestamp: Date.now()
        });
        
        return result;
      }
      
      console.log(`[calculateCommissionByLevel] Found applicable rate: ${applicableRate.rate}%`);
      const calculatedAmount = (amount * applicableRate.rate) / 100;
      console.log(`[calculateCommissionByLevel] Calculated commission amount: ${calculatedAmount}`);
      
      const result = {
        rate: applicableRate.rate,
        amount: calculatedAmount,
        levelName
      };
      
      // Cache the result
      commissionCache.set(cacheKey, {
        value: result,
        timestamp: Date.now()
      });
      
      return result;
    } else {
      // Use the rates from the level
      const applicableRate = level.rates.find(
        rate => amount >= rate.min_amount && amount <= rate.max_amount
      );
      
      if (!applicableRate) {
        console.log(`[calculateCommissionByLevel] No applicable rate found in level rates for amount: ${amount}`);
        const result = {
          rate: 0,
          amount: 0,
          levelName: level.name
        };
        
        // Cache the result
        commissionCache.set(cacheKey, {
          value: result,
          timestamp: Date.now()
        });
        
        return result;
      }
      
      console.log(`[calculateCommissionByLevel] Found applicable rate from level: ${applicableRate.rate}%`);
      const calculatedAmount = (amount * applicableRate.rate) / 100;
      
      const result = {
        rate: applicableRate.rate,
        amount: calculatedAmount,
        levelName: level.name
      };
      
      // Cache the result with timestamp
      commissionCache.set(cacheKey, {
        value: result,
        timestamp: Date.now()
      });
      
      return result;
    }
  } catch (error) {
    console.error("[calculateCommissionByLevel] Error:", error);
    return { rate: 0, amount: 0 };
  }
};
