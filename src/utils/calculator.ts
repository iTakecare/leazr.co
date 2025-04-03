
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

// Flag to prevent simultaneous calculations for the same parameters
const pendingCalculations = new Set();

/**
 * Calculate monthly leasing payment
 * Formula: Amount * Coefficient / 100 = Monthly payment
 */
export const calculateMonthlyLeasing = (amount: number): number => {
  // Return 0 for invalid amounts to prevent NaN propagation
  if (isNaN(amount) || amount <= 0) return 0;
  
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
  // Return 0 for invalid amounts to prevent NaN propagation
  if (isNaN(amount) || amount <= 0) return 0;
  
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
  // Return 0 for invalid amounts to prevent NaN propagation
  if (isNaN(amount) || amount <= 0) return 0;
  
  const coefficient = leasingCoefficients.find(
    (c) => amount >= c.min && amount <= c.max
  );
  
  return coefficient?.rate || 0;
};

/**
 * Get commission rate based on amount
 */
export const getCommissionRate = (amount: number): number => {
  // Return 0 for invalid amounts to prevent NaN propagation
  if (isNaN(amount) || amount <= 0) return 0;
  
  const commissionRate = commissionRates.find(
    (c) => amount >= c.min && amount <= c.max
  );
  
  return commissionRate?.rate || 0;
};

/**
 * Calculate commission based on amount and commission level
 */
export const calculateCommissionByLevel = async (
  amount: number, 
  levelId?: string, 
  type: 'partner' | 'ambassador' = 'partner', 
  ambassadorId?: string
): Promise<{ rate: number, amount: number, levelName?: string }> => {
  try {
    // Return early if amount is invalid
    if (isNaN(amount) || amount <= 0) {
      return { rate: 0, amount: 0 };
    }
    
    // Create a unique cache key for this combination of parameters
    const cacheKey = `${amount}-${levelId}-${type}-${ambassadorId}`;
    
    // Check if we have a valid cached result
    const cachedItem = commissionCache.get(cacheKey);
    if (cachedItem && cachedItem.timestamp && (Date.now() - cachedItem.timestamp < CACHE_TTL)) {
      return cachedItem.value;
    }
    
    // Check if this calculation is already in progress, if so wait for it
    if (pendingCalculations.has(cacheKey)) {
      // Return a default value or wait until the calculation completes
      const startTime = Date.now();
      while (pendingCalculations.has(cacheKey)) {
        // If waiting too long (1 second), return default value
        if (Date.now() - startTime > 1000) {
          return { rate: 0, amount: 0 };
        }
        // Small pause to prevent CPU blocking
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Check cache again after waiting
      const updatedCache = commissionCache.get(cacheKey);
      if (updatedCache && updatedCache.timestamp) {
        return updatedCache.value;
      }
    }
    
    // Mark this calculation as pending
    pendingCalculations.add(cacheKey);
    
    try {
      let actualLevelId = levelId;
      let levelName: string | undefined;
      
      // If an ambassador ID is provided, get their commission level from cache first
      if (ambassadorId) {
        const ambassadorCacheKey = `ambassador-${ambassadorId}`;
        const cachedAmbassador = commissionCache.get(ambassadorCacheKey);
        
        if (cachedAmbassador && cachedAmbassador.timestamp && 
            (Date.now() - cachedAmbassador.timestamp < CACHE_TTL)) {
          actualLevelId = cachedAmbassador.value.commission_level_id;
        } else {
          // Get the ambassador record with commission_level_id directly from the database
          const { data: ambassador, error: ambassadorError } = await supabase
            .from('ambassadors')
            .select('commission_level_id, name')
            .eq('id', ambassadorId)
            .single();
          
          if (!ambassadorError && ambassador) {
            actualLevelId = ambassador.commission_level_id;
            
            // Cache the ambassador data
            commissionCache.set(ambassadorCacheKey, {
              value: ambassador,
              timestamp: Date.now()
            });
          }
        }
      }
  
      // If no level ID is provided, use the default level
      if (!actualLevelId) {
        const defaultCacheKey = `default-level-${type}`;
        const cachedDefault = commissionCache.get(defaultCacheKey);
        
        if (cachedDefault && cachedDefault.timestamp && 
            (Date.now() - cachedDefault.timestamp < CACHE_TTL)) {
          actualLevelId = cachedDefault.value.id;
          levelName = cachedDefault.value.name;
        } else {
          const defaultLevel = await fetchDefaultCommissionLevel(type);
          
          if (defaultLevel) {
            actualLevelId = defaultLevel.id;
            levelName = defaultLevel.name;
            
            // Cache the default level
            commissionCache.set(defaultCacheKey, {
              value: defaultLevel,
              timestamp: Date.now()
            });
          }
        }
      }
      
      // If still no ID, use static rates
      if (!actualLevelId) {
        const staticRate = getCommissionRate(amount);
        
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
      
      // Get full level with rates from cache or database
      const levelCacheKey = `level-${actualLevelId}`;
      let level;
      const cachedLevel = commissionCache.get(levelCacheKey);
      
      if (cachedLevel && cachedLevel.timestamp && 
          (Date.now() - cachedLevel.timestamp < CACHE_TTL)) {
        level = cachedLevel.value;
      } else {
        level = await getCommissionLevelWithRates(actualLevelId);
        
        if (level) {
          // Cache the level with rates
          commissionCache.set(levelCacheKey, {
            value: level,
            timestamp: Date.now()
          });
        }
      }
      
      // Process rates and calculate commission
      if (!level || !level.rates || level.rates.length === 0) {
        // Fallback to fetching rates separately if level doesn't include them
        const ratesCacheKey = `rates-${actualLevelId}`;
        let rates;
        const cachedRates = commissionCache.get(ratesCacheKey);
        
        if (cachedRates && cachedRates.timestamp && 
            (Date.now() - cachedRates.timestamp < CACHE_TTL)) {
          rates = cachedRates.value;
        } else {
          rates = await fetchCommissionRates(actualLevelId);
          
          // Cache the rates
          commissionCache.set(ratesCacheKey, {
            value: rates,
            timestamp: Date.now()
          });
        }
        
        // Find applicable rate based on amount
        const applicableRate = rates.find(
          rate => amount >= rate.min_amount && amount <= rate.max_amount
        );
        
        if (!applicableRate) {
          const result = {
            rate: 0,
            amount: 0,
            levelName
          };
          
          commissionCache.set(cacheKey, {
            value: result,
            timestamp: Date.now()
          });
          
          return result;
        }
        
        const calculatedAmount = (amount * applicableRate.rate) / 100;
        
        const result = {
          rate: applicableRate.rate,
          amount: calculatedAmount,
          levelName
        };
        
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
          const result = {
            rate: 0,
            amount: 0,
            levelName: level.name
          };
          
          commissionCache.set(cacheKey, {
            value: result,
            timestamp: Date.now()
          });
          
          return result;
        }
        
        const calculatedAmount = (amount * applicableRate.rate) / 100;
        
        const result = {
          rate: applicableRate.rate,
          amount: calculatedAmount,
          levelName: level.name
        };
        
        commissionCache.set(cacheKey, {
          value: result,
          timestamp: Date.now()
        });
        
        return result;
      }
    } finally {
      // Always remove from pending calculations, even in case of error
      pendingCalculations.delete(cacheKey);
    }
  } catch (error) {
    console.error("[calculateCommissionByLevel] Error:", error);
    return { rate: 0, amount: 0 };
  }
};
