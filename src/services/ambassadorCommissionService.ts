
import { supabase } from "@/integrations/supabase/client";
import { getAmbassadorCommissionLevel, getCommissionRates } from "./commissionService";

export interface AmbassadorCommissionData {
  amount: number;
  rate: number;
  levelName: string;
  financedAmount: number;
}

export interface AmbassadorCommission {
  id: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  date: string;
  clientName: string;
  clientId?: string;
  description?: string;
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
 * Récupère les commissions d'un ambassadeur
 */
export const getAmbassadorCommissions = async (ambassadorId: string): Promise<AmbassadorCommission[]> => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select(`
        id,
        commission,
        commission_status,
        created_at,
        client_name,
        client_id,
        equipment_description
      `)
      .eq('ambassador_id', ambassadorId)
      .not('commission', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("[getAmbassadorCommissions] Error:", error);
      return [];
    }

    return (data || []).map(offer => ({
      id: offer.id,
      amount: offer.commission || 0,
      status: offer.commission_status || 'pending',
      date: offer.created_at,
      clientName: offer.client_name,
      clientId: offer.client_id,
      description: offer.equipment_description
    }));
  } catch (error) {
    console.error("[getAmbassadorCommissions] Error:", error);
    return [];
  }
};

/**
 * Met à jour le statut d'une commission d'ambassadeur
 */
export const updateAmbassadorCommissionStatus = async (
  offerId: string, 
  newStatus: 'pending' | 'paid' | 'cancelled'
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('offers')
      .update({ 
        commission_status: newStatus,
        commission_paid_at: newStatus === 'paid' ? new Date().toISOString() : null
      })
      .eq('id', offerId);

    if (error) {
      console.error("[updateAmbassadorCommissionStatus] Error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[updateAmbassadorCommissionStatus] Error:", error);
    return false;
  }
};

/**
 * Calcule les totaux des commissions d'un ambassadeur
 */
export const calculateTotalAmbassadorCommissions = async (ambassadorId: string) => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('commission, commission_status')
      .eq('ambassador_id', ambassadorId)
      .not('commission', 'is', null);

    if (error) {
      console.error("[calculateTotalAmbassadorCommissions] Error:", error);
      return { pending: 0, paid: 0, total: 0 };
    }

    const totals = (data || []).reduce(
      (acc, offer) => {
        const amount = offer.commission || 0;
        acc.total += amount;
        
        if (offer.commission_status === 'paid') {
          acc.paid += amount;
        } else if (offer.commission_status === 'pending') {
          acc.pending += amount;
        }
        
        return acc;
      },
      { pending: 0, paid: 0, total: 0 }
    );

    return totals;
  } catch (error) {
    console.error("[calculateTotalAmbassadorCommissions] Error:", error);
    return { pending: 0, paid: 0, total: 0 };
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
