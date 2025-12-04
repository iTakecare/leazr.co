
import { supabase } from "@/integrations/supabase/client";
import { getAmbassadorCommissionLevel, getCommissionRates } from "./commissionService";

export interface AmbassadorCommissionData {
  amount: number;
  rate: number;
  levelName: string;
  marginAmount: number;
  pcCount?: number;
}

export interface EquipmentItem {
  product_id?: string;
  title?: string;
  quantity?: number;
  category_id?: string;
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

// IDs des catégories PC (Laptop et Desktop)
const PC_CATEGORY_IDS = [
  'a8d1d79b-b220-49c2-ad37-f5791ca1513a', // Laptop
  '4afd176a-7da0-49ea-accb-97bee044845e'  // Desktop
];

// Mots-clés pour identifier les PC par titre (fallback) - spécifiques aux modèles
const PC_KEYWORDS = ['laptop', 'ordinateur portable', 'elitebook', 'probook', 'thinkpad', 'thinkbook', 'macbook', 'notebook', 'desktop', 'latitude', 'precision', 'inspiron', 'xps', 'pavilion', 'spectre', 'envy', 'zbook', 'omen'];

/**
 * Compte le nombre de PC dans la liste d'équipements - Version optimisée avec requête batch
 */
const countPCsInEquipment = async (equipmentList: EquipmentItem[]): Promise<number> => {
  if (!equipmentList || equipmentList.length === 0) return 0;
  
  let pcCount = 0;
  const productIdsToCheck: { id: string; qty: number }[] = [];
  
  for (const equipment of equipmentList) {
    const qty = equipment.quantity || 1;
    
    // Méthode 1: Vérifier via category_id direct
    if (equipment.category_id && PC_CATEGORY_IDS.includes(equipment.category_id)) {
      pcCount += qty;
      continue;
    }
    
    // Méthode 2: Si product_id sans category_id, ajouter à la liste pour requête batch
    if (equipment.product_id) {
      productIdsToCheck.push({ id: equipment.product_id, qty });
      continue;
    }
    
    // Méthode 3: Fallback sur mots-clés dans le titre
    if (equipment.title) {
      const titleLower = equipment.title.toLowerCase();
      if (PC_KEYWORDS.some(keyword => titleLower.includes(keyword))) {
        pcCount += qty;
      }
    }
  }
  
  // Une seule requête batch pour tous les product_ids
  if (productIdsToCheck.length > 0) {
    const { data } = await supabase
      .from('products')
      .select('id, category_id')
      .in('id', productIdsToCheck.map(p => p.id));
    
    if (data) {
      for (const product of data) {
        if (product.category_id && PC_CATEGORY_IDS.includes(product.category_id)) {
          const item = productIdsToCheck.find(p => p.id === product.id);
          pcCount += item?.qty || 1;
        }
      }
    }
  }
  
  return pcCount;
};

/**
 * Calcule la commission d'un ambassadeur selon son barème attribué
 * La commission est calculée sur la marge totale générée, pas sur le montant financé
 */
export const calculateAmbassadorCommission = async (
  ambassadorId: string,
  marginAmount: number,
  purchaseAmount?: number,
  totalMonthlyPayment?: number,
  equipmentList?: EquipmentItem[]
): Promise<AmbassadorCommissionData> => {
  try {
    // Récupérer le niveau de commission de l'ambassadeur
    const commissionLevel = await getAmbassadorCommissionLevel(ambassadorId);
    
    if (!commissionLevel) {
      return {
        amount: Math.round(marginAmount * 0.05),
        rate: 5,
        levelName: "Aucun barème attribué",
        marginAmount
      };
    }

    const calculationMode = commissionLevel.calculation_mode || 'margin';
    
    // Mode mensualité
    if (calculationMode === 'monthly_payment') {
      if (!totalMonthlyPayment || totalMonthlyPayment <= 0) {
        return { amount: 0, rate: 0, levelName: commissionLevel.name, marginAmount };
      }
      
      const fixedRate = commissionLevel.fixed_rate || 0;
      const commissionAmount = Math.round(totalMonthlyPayment * (fixedRate / 100));
      
      return {
        amount: commissionAmount,
        rate: fixedRate,
        levelName: `${commissionLevel.name} (% sur mensualité)`,
        marginAmount
      };
    }

    // Mode "1 mensualité arrondie à l'euro supérieur"
    if (calculationMode === 'one_monthly_rounded_up') {
      if (!totalMonthlyPayment || totalMonthlyPayment <= 0) {
        return { amount: 0, rate: 100, levelName: commissionLevel.name, marginAmount };
      }
      
      const commissionAmount = Math.ceil(totalMonthlyPayment);
      
      return {
        amount: commissionAmount,
        rate: 100,
        levelName: `${commissionLevel.name} (1 mensualité)`,
        marginAmount
      };
    }

    // Mode "Forfait par PC"
    if (calculationMode === 'fixed_per_pc') {
      const fixedAmountPerPC = commissionLevel.fixed_rate || 0;
      const pcCount = await countPCsInEquipment(equipmentList || []);
      
      if (pcCount === 0) {
        return {
          amount: 0,
          rate: fixedAmountPerPC,
          levelName: `${commissionLevel.name} (Forfait: ${fixedAmountPerPC}€/PC)`,
          marginAmount,
          pcCount: 0
        };
      }
      
      const commissionAmount = Math.round(pcCount * fixedAmountPerPC);
      
      return {
        amount: commissionAmount,
        rate: fixedAmountPerPC,
        levelName: `${commissionLevel.name} (${pcCount} PC × ${fixedAmountPerPC}€)`,
        marginAmount,
        pcCount
      };
    }

    // Récupérer les taux du niveau de commission pour les modes margin et purchase_price
    const rates = await getCommissionRates(commissionLevel.id);
    
    if (!rates || rates.length === 0) {
      return {
        amount: Math.round(marginAmount * 0.05),
        rate: 5,
        levelName: commissionLevel.name,
        marginAmount
      };
    }

    const baseAmount = calculationMode === 'purchase_price' ? (purchaseAmount || 0) : marginAmount;
    
    if (calculationMode === 'purchase_price' && (!purchaseAmount || purchaseAmount <= 0)) {
      return { amount: 0, rate: 0, levelName: commissionLevel.name, marginAmount };
    }
    
    const applicableRate = rates.find(rate => 
      baseAmount >= rate.min_amount && baseAmount <= rate.max_amount
    ) || rates[0];

    if (applicableRate) {
      const commissionAmount = Math.round(baseAmount * (applicableRate.rate / 100));
      
      return {
        amount: commissionAmount,
        rate: applicableRate.rate,
        levelName: `${commissionLevel.name} (${calculationMode === 'margin' ? '% sur marge' : '% sur prix d\'achat'})`,
        marginAmount
      };
    }

    const defaultRate = 5;
    const commissionAmount = Math.round(marginAmount * (defaultRate / 100));
    
    return {
      amount: commissionAmount,
      rate: defaultRate,
      levelName: commissionLevel.name,
      marginAmount
    };

  } catch (error) {
    console.error("[calculateAmbassadorCommission] Error:", error);
    
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
