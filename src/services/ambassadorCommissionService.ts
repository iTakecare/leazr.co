
import { supabase } from "@/integrations/supabase/client";
import { getAmbassadorCommissionLevel, getCommissionRates } from "./commissionService";

export interface AmbassadorCommissionData {
  amount: number;
  rate: number;
  levelName: string;
  financedAmount: number;
}

/**
 * Calcule la commission d'un ambassadeur selon son barème attribué
 */
export const calculateAmbassadorCommission = async (
  ambassadorId: string,
  financedAmount: number
): Promise<AmbassadorCommissionData> => {
  try {
    console.log(`[calculateAmbassadorCommission] Calculating for ambassador ${ambassadorId}, amount: ${financedAmount}`);
    
    // Récupérer le niveau de commission de l'ambassadeur
    const commissionLevel = await getAmbassadorCommissionLevel(ambassadorId);
    
    if (!commissionLevel) {
      console.log("[calculateAmbassadorCommission] No commission level found, using default");
      return {
        amount: Math.round(financedAmount * 0.05), // 5% par défaut
        rate: 5,
        levelName: "Aucun barème attribué",
        financedAmount
      };
    }

    console.log("[calculateAmbassadorCommission] Found commission level:", commissionLevel.name);

    // Récupérer les taux du niveau de commission
    const rates = await getCommissionRates(commissionLevel.id);
    
    if (!rates || rates.length === 0) {
      console.log("[calculateAmbassadorCommission] No rates found, using default");
      return {
        amount: Math.round(financedAmount * 0.05),
        rate: 5,
        levelName: commissionLevel.name,
        financedAmount
      };
    }

    console.log("[calculateAmbassadorCommission] Found rates:", rates);

    // Trouver le taux applicable selon le montant financé
    const applicableRate = rates.find(rate => 
      financedAmount >= rate.min_amount && financedAmount <= rate.max_amount
    );

    if (applicableRate) {
      const commissionAmount = Math.round(financedAmount * (applicableRate.rate / 100));
      console.log("[calculateAmbassadorCommission] Applied rate found:", applicableRate.rate, "Commission:", commissionAmount);
      
      return {
        amount: commissionAmount,
        rate: applicableRate.rate,
        levelName: commissionLevel.name,
        financedAmount
      };
    }

    // Si aucun taux ne correspond exactement, prendre le taux le plus élevé disponible
    const maxRate = rates.reduce((max, rate) => rate.rate > max.rate ? rate : max, rates[0]);
    const commissionAmount = Math.round(financedAmount * (maxRate.rate / 100));
    
    console.log("[calculateAmbassadorCommission] No exact rate found, using max rate:", maxRate.rate);
    
    return {
      amount: commissionAmount,
      rate: maxRate.rate,
      levelName: commissionLevel.name,
      financedAmount
    };

  } catch (error) {
    console.error("[calculateAmbassadorCommission] Error:", error);
    
    // Fallback en cas d'erreur
    return {
      amount: Math.round(financedAmount * 0.05),
      rate: 5,
      levelName: "Erreur - Commission par défaut",
      financedAmount
    };
  }
};

/**
 * Vérifie si un ambassadeur a un barème de commission attribué
 */
export const hasCommissionLevel = async (ambassadorId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('ambassadors')
      .select('commission_level_id')
      .eq('id', ambassadorId)
      .single();
    
    if (error) {
      console.error("[hasCommissionLevel] Error:", error);
      return false;
    }
    
    return data && data.commission_level_id !== null;
  } catch (error) {
    console.error("[hasCommissionLevel] Error:", error);
    return false;
  }
};

/**
 * Récupère les informations de barème d'un ambassadeur
 */
export const getAmbassadorCommissionInfo = async (ambassadorId: string) => {
  try {
    const { data, error } = await supabase
      .from('ambassadors')
      .select(`
        id,
        user_id,
        commission_level_id,
        commission_levels (
          id,
          name,
          type,
          is_default
        )
      `)
      .eq('id', ambassadorId)
      .single();
    
    if (error) {
      console.error("[getAmbassadorCommissionInfo] Error:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("[getAmbassadorCommissionInfo] Error:", error);
    return null;
  }
};
