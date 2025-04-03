import { supabase } from "@/integrations/supabase/client";
import { 
  CommissionRate, 
  getCommissionRates as fetchCommissionRates, 
  getDefaultCommissionLevel as fetchDefaultCommissionLevel,
  getAmbassadorCommissionLevel as fetchAmbassadorCommissionLevel,
  getCommissionLevelWithRates
} from "@/services/commissionService";
import { getLeasers } from "@/services/leaserService";

// Valeurs de repli statiques (ne seront utilisées que si la récupération depuis la DB échoue)
export const leasingCoefficients = [
  { min: 25000.01, max: 50000, rate: 3.16 },
  { min: 12500.01, max: 25000, rate: 3.17 },
  { min: 5000.01, max: 12500, rate: 3.18 },
  { min: 2500.01, max: 5000, rate: 3.27 },
  { min: 500, max: 2500, rate: 3.55 },
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

// Cache pour les coefficients de leasing
const coefficientCache: {
  data: any[];
  timestamp: number;
} = {
  data: [],
  timestamp: 0
};

/**
 * Get coefficient rate based on amount from DB or fallback to static values
 */
export const getCoefficientRate = async (amount: number): Promise<number> => {
  try {
    // Vérifier si le cache est récent (moins de 5 minutes)
    if (coefficientCache.data.length > 0 && Date.now() - coefficientCache.timestamp < 300000) {
      const cachedCoefficient = coefficientCache.data.find(
        (c) => amount >= c.min && amount <= c.max
      );
      
      if (cachedCoefficient) {
        return cachedCoefficient.coefficient;
      }
    }
    
    // Récupérer les leasers depuis la base de données
    const leasers = await getLeasers();
    
    if (leasers && leasers.length > 0) {
      // Prenons le premier leaser (généralement Grenke)
      const leaser = leasers[0];
      
      // Mettre à jour le cache
      if (leaser.ranges && leaser.ranges.length > 0) {
        coefficientCache.data = leaser.ranges;
        coefficientCache.timestamp = Date.now();
        
        // Trouver la tranche applicable
        const range = leaser.ranges.find(
          (r) => amount >= r.min && amount <= r.max
        );
        
        if (range) {
          return range.coefficient;
        }
      }
    }
    
    // Si on arrive ici, utiliser les valeurs statiques de repli
    const staticCoefficient = leasingCoefficients.find(
      (c) => amount >= c.min && amount <= c.max
    );
    
    return staticCoefficient?.rate || 0;
  } catch (error) {
    console.error("Erreur lors de la récupération des coefficients:", error);
    
    // En cas d'erreur, revenir aux valeurs statiques
    const staticCoefficient = leasingCoefficients.find(
      (c) => amount >= c.min && amount <= c.max
    );
    
    return staticCoefficient?.rate || 0;
  }
};

/**
 * Version synchrone pour la compatibilité avec le code existant
 * Cette fonction utilisera les valeurs en cache ou les valeurs statiques si le cache est vide
 */
export const getCoefficientRateSync = (amount: number): number => {
  // Utiliser le cache s'il existe et est récent
  if (coefficientCache.data.length > 0 && Date.now() - coefficientCache.timestamp < 300000) {
    const cachedCoefficient = coefficientCache.data.find(
      (c) => amount >= c.min && amount <= c.max
    );
    
    if (cachedCoefficient) {
      return cachedCoefficient.coefficient;
    }
  }
  
  // Sinon, utiliser les valeurs statiques
  const staticCoefficient = leasingCoefficients.find(
    (c) => amount >= c.min && amount <= c.max
  );
  
  return staticCoefficient?.rate || 0;
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
 * Calcul du montant financé à partir de la mensualité et du coefficient
 * Formule: (mensualité × 100) ÷ coefficient = montant financé
 */
export const calculateFinancedAmount = (monthlyPayment: number, coefficient: number): number => {
  if (!coefficient || coefficient <= 0 || !monthlyPayment) return 0;
  
  return (monthlyPayment * 100) / coefficient;
};

// Cache de calcul de commission pour éviter les calculs répétitifs
interface CommissionCache {
  [key: string]: {
    timestamp: number;
    result: {
      rate: number;
      amount: number;
      levelName?: string;
    }
  }
}

const commissionCache: CommissionCache = {};
const CACHE_TIMEOUT = 120000; // 2 minutes
const currentCalculation: {[key: string]: Promise<any>} = {};

/**
 * Calculate commission based on amount and commission level
 * Optimized with better caching and calculation management
 */
export const calculateCommissionByLevel = async (
  amount: number, 
  levelId?: string, 
  type: 'partner' | 'ambassador' = 'partner', 
  ambassadorId?: string
): Promise<{ rate: number, amount: number, levelName?: string }> => {
  // Vérifier si les données d'entrée sont valides pour éviter des calculs inutiles
  if (!amount || amount <= 0) {
    return { rate: 0, amount: 0, levelName: "" };
  }
  
  // Arrondir le montant pour une meilleure mise en cache
  const roundedAmount = Math.round(amount * 100) / 100;
  
  try {
    // Créer une clé de cache unique basée sur les paramètres
    const cacheKey = `${roundedAmount}-${levelId || 'default'}-${type}-${ambassadorId || 'none'}`;
    
    // Vérifier si nous avons un résultat récent en cache
    const cachedResult = commissionCache[cacheKey];
    if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_TIMEOUT) {
      return cachedResult.result;
    }
    
    // Vérifier si un calcul est déjà en cours pour ces mêmes paramètres
    if (currentCalculation[cacheKey]) {
      return currentCalculation[cacheKey];
    }
    
    // Créer une promesse pour le calcul en cours
    currentCalculation[cacheKey] = (async () => {
      let actualLevelId = levelId;
      let levelName: string | undefined;
      
      // Si un ID d'ambassadeur est fourni, récupérer son niveau de commission directement de la base de données
      if (ambassadorId) {
        try {
          // Get the ambassador record with commission_level_id directly from the database to ensure we have the latest data
          const { data: ambassador, error: ambassadorError } = await supabase
            .from('ambassadors')
            .select('commission_level_id, name')
            .eq('id', ambassadorId)
            .single();
          
          if (!ambassadorError && ambassador && ambassador.commission_level_id) {
            actualLevelId = ambassador.commission_level_id;
            
            // Get the level name
            const { data: levelData } = await supabase
              .from('commission_levels')
              .select('name')
              .eq('id', actualLevelId)
              .single();
              
            if (levelData) {
              levelName = levelData.name;
            }
          }
        } catch (error) {
          console.error("Error fetching ambassador data:", error);
          // Fallback to default calculation
        }
      }
      
      // Si aucun ID de niveau n'est fourni, utiliser le niveau par défaut
      if (!actualLevelId) {
        try {
          const defaultLevel = await fetchDefaultCommissionLevel(type);
          
          if (defaultLevel) {
            actualLevelId = defaultLevel.id;
            levelName = defaultLevel.name;
          }
        } catch (error) {
          console.error("Error fetching default commission level:", error);
          // Fallback to static rates
        }
      }
      
      // Si toujours pas d'ID, utiliser les taux statiques
      if (!actualLevelId) {
        const staticRate = getCommissionRate(roundedAmount);
        const result = {
          rate: staticRate,
          amount: (roundedAmount * staticRate) / 100,
          levelName: ""
        };
        
        // Stocker le résultat en cache
        commissionCache[cacheKey] = {
          timestamp: Date.now(),
          result
        };
        
        return result;
      }
      
      // Get full level with rates
      try {
        const level = await getCommissionLevelWithRates(actualLevelId);
        
        if (!level || !level.rates || level.rates.length === 0) {
          try {
            const rates = await fetchCommissionRates(actualLevelId);
            
            // Trouver le taux applicable en fonction du montant
            const applicableRate = rates.find(
              rate => roundedAmount >= rate.min_amount && roundedAmount <= rate.max_amount
            );
            
            if (!applicableRate) {
              const result = {
                rate: 0,
                amount: 0,
                levelName
              };
              
              // Stocker le résultat en cache
              commissionCache[cacheKey] = {
                timestamp: Date.now(),
                result
              };
              
              return result;
            }
            
            const calculatedAmount = (roundedAmount * applicableRate.rate) / 100;
            const result = {
              rate: applicableRate.rate,
              amount: calculatedAmount,
              levelName
            };
            
            // Stocker le résultat en cache
            commissionCache[cacheKey] = {
              timestamp: Date.now(),
              result
            };
            
            return result;
          } catch (error) {
            console.error("Error fetching commission rates:", error);
            // Return default result
            const result = {
              rate: 0,
              amount: 0,
              levelName
            };
            
            commissionCache[cacheKey] = {
              timestamp: Date.now(),
              result
            };
            
            return result;
          }
        } else {
          // Use the rates from the level
          const applicableRate = level.rates.find(
            rate => roundedAmount >= rate.min_amount && roundedAmount <= rate.max_amount
          );
          
          if (!applicableRate) {
            const result = {
              rate: 0,
              amount: 0,
              levelName: level.name
            };
            
            // Stocker le résultat en cache
            commissionCache[cacheKey] = {
              timestamp: Date.now(),
              result
            };
            
            return result;
          }
          
          const calculatedAmount = (roundedAmount * applicableRate.rate) / 100;
          const result = {
            rate: applicableRate.rate,
            amount: calculatedAmount,
            levelName: level.name
          };
          
          // Stocker le résultat en cache
          commissionCache[cacheKey] = {
            timestamp: Date.now(),
            result
          };
          
          return result;
        }
      } catch (error) {
        console.error("Error getting commission level with rates:", error);
        // Return default result
        const result = {
          rate: 0,
          amount: 0,
          levelName
        };
        
        commissionCache[cacheKey] = {
          timestamp: Date.now(),
          result
        };
        
        return result;
      }
    })();
    
    // Attendre le résultat du calcul
    const result = await currentCalculation[cacheKey];
    
    // Nettoyer la promesse en cours
    delete currentCalculation[cacheKey];
    
    return result;
  } catch (error) {
    console.error("Error calculating commission:", error);
    return {
      rate: 0,
      amount: 0,
      levelName: ""
    };
  }
};
