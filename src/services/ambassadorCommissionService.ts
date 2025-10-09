
import { supabase } from "@/integrations/supabase/client";
import { getAmbassadorCommissionLevel, getCommissionRates } from "./commissionService";

export interface AmbassadorCommissionData {
  amount: number;
  rate: number;
  levelName: string;
  marginAmount: number;
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
 * La commission est calculée sur la marge totale générée, pas sur le montant financé
 */
export const calculateAmbassadorCommission = async (
  ambassadorId: string,
  marginAmount: number,
  purchaseAmount?: number,
  totalMonthlyPayment?: number
): Promise<AmbassadorCommissionData> => {
  try {
    console.log(`[calculateAmbassadorCommission] Calculating for ambassador ${ambassadorId}, margin: ${marginAmount}, purchase: ${purchaseAmount}, monthly: ${totalMonthlyPayment}`);
    
    // Récupérer le niveau de commission de l'ambassadeur
    const commissionLevel = await getAmbassadorCommissionLevel(ambassadorId);
    
    if (!commissionLevel) {
      console.log("[calculateAmbassadorCommission] No commission level found, using default");
      return {
        amount: Math.round(marginAmount * 0.05), // 5% par défaut
        rate: 5,
        levelName: "Aucun barème attribué",
        marginAmount
      };
    }

    console.log("[calculateAmbassadorCommission] Found commission level:", commissionLevel.name);

    // Déterminer le mode de calcul
    const calculationMode = commissionLevel.calculation_mode || 'margin';
    
    // Mode mensualité : utilise le taux fixe sur la mensualité totale
    if (calculationMode === 'monthly_payment') {
      console.log(`[calculateAmbassadorCommission] Using monthly_payment mode with fixed rate: ${commissionLevel.fixed_rate}%`);
      
      if (!totalMonthlyPayment || totalMonthlyPayment <= 0) {
        console.log("[calculateAmbassadorCommission] Monthly payment mode requires valid monthly payment amount");
        return {
          amount: 0,
          rate: 0,
          levelName: commissionLevel.name,
          marginAmount
        };
      }
      
      const fixedRate = commissionLevel.fixed_rate || 0;
      const commissionAmount = Math.round(totalMonthlyPayment * (fixedRate / 100));
      
      console.log(`[calculateAmbassadorCommission] Monthly payment commission: ${commissionAmount} (${fixedRate}% of ${totalMonthlyPayment})`);
      
      return {
        amount: commissionAmount,
        rate: fixedRate,
        levelName: `${commissionLevel.name} (% sur mensualité)`,
        marginAmount
      };
    }

    // Récupérer les taux du niveau de commission pour les modes margin et purchase_price
    const rates = await getCommissionRates(commissionLevel.id);
    
    if (!rates || rates.length === 0) {
      console.log("[calculateAmbassadorCommission] No rates found, using default");
      return {
        amount: Math.round(marginAmount * 0.05),
        rate: 5,
        levelName: commissionLevel.name,
        marginAmount
      };
    }

    console.log("[calculateAmbassadorCommission] Found rates:", rates);

    // Déterminer le montant de base pour le calcul selon le mode de calcul
    const baseAmount = calculationMode === 'purchase_price' ? (purchaseAmount || 0) : marginAmount;
    
    console.log(`[calculateAmbassadorCommission] Using calculation mode: ${calculationMode}, base amount: ${baseAmount}`);
    
    // Validation pour le mode purchase_price
    if (calculationMode === 'purchase_price' && (!purchaseAmount || purchaseAmount <= 0)) {
      console.log("[calculateAmbassadorCommission] Purchase price mode requires valid purchase amount");
      return {
        amount: 0,
        rate: 0,
        levelName: commissionLevel.name,
        marginAmount
      };
    }
    
    // Rechercher le taux applicable basé sur le montant de base
    const applicableRate = rates.find(rate => 
      baseAmount >= rate.min_amount && baseAmount <= rate.max_amount
    ) || rates[0]; // Fallback sur le premier taux si aucun ne correspond

    if (applicableRate) {
      const commissionAmount = Math.round(baseAmount * (applicableRate.rate / 100));
      console.log(`[calculateAmbassadorCommission] Applied rate found: ${applicableRate.rate}%, Commission: ${commissionAmount}, on ${calculationMode}: ${baseAmount}`);
      
      return {
        amount: commissionAmount,
        rate: applicableRate.rate,
        levelName: `${commissionLevel.name} (${calculationMode === 'margin' ? '% sur marge' : '% sur prix d\'achat'})`,
        marginAmount
      };
    }

    // Si aucun taux ne correspond, utiliser le taux par défaut
    const defaultRate = 5;
    const commissionAmount = Math.round(marginAmount * (defaultRate / 100));
    
    console.log("[calculateAmbassadorCommission] No rate found, using default:", defaultRate);
    
    return {
      amount: commissionAmount,
      rate: defaultRate,
      levelName: commissionLevel.name,
      marginAmount
    };

  } catch (error) {
    console.error("[calculateAmbassadorCommission] Error:", error);
    
    // Fallback en cas d'erreur
    return {
      amount: Math.round(marginAmount * 0.05),
      rate: 5,
      levelName: "Erreur - Commission par défaut",
      marginAmount
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
