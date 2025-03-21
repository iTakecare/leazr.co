
import { supabase } from "@/integrations/supabase/client";

export interface CommissionRate {
  id: string;
  commission_level_id: string;
  min_amount: number;
  max_amount: number;
  rate: number;
  created_at: string;
  updated_at: string;
}

export interface CommissionLevel {
  id: string;
  name: string;
  type: 'partner' | 'ambassador';
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Récupère les niveaux de commission
 */
export const getCommissionLevels = async (type: 'partner' | 'ambassador' = 'partner'): Promise<CommissionLevel[]> => {
  try {
    console.log(`[getCommissionLevels] Fetching commission levels for type: ${type}`);
    const { data, error } = await supabase
      .from('commission_levels')
      .select('*')
      .eq('type', type)
      .order('name');
    
    if (error) {
      console.error("[getCommissionLevels] Error fetching commission levels:", error);
      throw error;
    }
    
    console.log(`[getCommissionLevels] Found ${data?.length || 0} commission levels`);
    return data || [];
  } catch (error) {
    console.error("[getCommissionLevels] Error:", error);
    return [];
  }
};

/**
 * Récupère les taux de commission pour un niveau donné
 */
export const getCommissionRates = async (levelId: string): Promise<CommissionRate[]> => {
  try {
    console.log(`[getCommissionRates] Fetching rates for level: ${levelId}`);
    const { data, error } = await supabase
      .from('commission_rates')
      .select('*')
      .eq('commission_level_id', levelId)
      .order('min_amount');
    
    if (error) {
      console.error("[getCommissionRates] Error fetching commission rates:", error);
      throw error;
    }
    
    console.log(`[getCommissionRates] Found ${data?.length || 0} rates for level ${levelId}`);
    
    // Si aucun taux n'est trouvé, utiliser des taux par défaut
    if (!data || data.length === 0) {
      console.log("[getCommissionRates] No rates found, using default static rates");
      return [
        {
          id: 'default-1',
          commission_level_id: levelId,
          min_amount: 500,
          max_amount: 2500,
          rate: 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'default-2',
          commission_level_id: levelId,
          min_amount: 2500.01,
          max_amount: 5000,
          rate: 13,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'default-3',
          commission_level_id: levelId,
          min_amount: 5000.01,
          max_amount: 12500,
          rate: 18,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'default-4',
          commission_level_id: levelId,
          min_amount: 12500.01,
          max_amount: 25000,
          rate: 21,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'default-5',
          commission_level_id: levelId,
          min_amount: 25000.01,
          max_amount: 50000,
          rate: 25,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
    }
    
    return data;
  } catch (error) {
    console.error("[getCommissionRates] Error:", error);
    return [];
  }
};

/**
 * Récupère le niveau de commission par défaut
 */
export const getDefaultCommissionLevel = async (type: 'partner' | 'ambassador' = 'partner'): Promise<CommissionLevel | null> => {
  try {
    console.log(`[getDefaultCommissionLevel] Fetching default commission level for type: ${type}`);
    const { data, error } = await supabase
      .from('commission_levels')
      .select('*')
      .eq('type', type)
      .eq('is_default', true)
      .single();
    
    if (error) {
      console.error("[getDefaultCommissionLevel] Error fetching default commission level:", error);
      
      // Si une erreur se produit, essayer de récupérer n'importe quel niveau du type demandé
      console.log("[getDefaultCommissionLevel] Trying to fetch any level of the requested type");
      const { data: anyLevel, error: secondError } = await supabase
        .from('commission_levels')
        .select('*')
        .eq('type', type)
        .limit(1);
      
      if (secondError || !anyLevel || anyLevel.length === 0) {
        console.error("[getDefaultCommissionLevel] Failed to get any commission level:", secondError);
        return null;
      }
      
      console.log("[getDefaultCommissionLevel] Found non-default level:", anyLevel[0]);
      return anyLevel[0];
    }
    
    console.log("[getDefaultCommissionLevel] Found default level:", data);
    return data;
  } catch (error) {
    console.error("[getDefaultCommissionLevel] Error:", error);
    return null;
  }
};

/**
 * Crée un niveau de commission
 */
export const createCommissionLevel = async (name: string, type: 'partner' | 'ambassador', isDefault: boolean = false): Promise<CommissionLevel | null> => {
  try {
    if (isDefault) {
      // Si le nouveau niveau est défini comme par défaut, mettre à jour tous les autres niveaux pour les définir comme non par défaut
      await supabase
        .from('commission_levels')
        .update({ is_default: false })
        .eq('type', type);
    }
    
    const { data, error } = await supabase
      .from('commission_levels')
      .insert([
        { name, type, is_default: isDefault }
      ])
      .select();
    
    if (error) {
      console.error("Error creating commission level:", error);
      throw error;
    }
    
    return data[0] || null;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
};

/**
 * Met à jour un niveau de commission
 */
export const updateCommissionLevel = async (id: string, name: string, isDefault: boolean = false): Promise<CommissionLevel | null> => {
  try {
    const { data: levelData, error: levelError } = await supabase
      .from('commission_levels')
      .select('type')
      .eq('id', id)
      .single();
    
    if (levelError) {
      console.error("Error fetching commission level type:", levelError);
      throw levelError;
    }
    
    const type = levelData.type;
    
    if (isDefault) {
      // Si le niveau est défini comme par défaut, mettre à jour tous les autres niveaux pour les définir comme non par défaut
      await supabase
        .from('commission_levels')
        .update({ is_default: false })
        .eq('type', type);
    }
    
    const { data, error } = await supabase
      .from('commission_levels')
      .update({ name, is_default: isDefault })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error("Error updating commission level:", error);
      throw error;
    }
    
    return data[0] || null;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
};

/**
 * Supprime un niveau de commission
 */
export const deleteCommissionLevel = async (id: string): Promise<boolean> => {
  try {
    // Vérifier si c'est le niveau par défaut
    const { data: levelData, error: levelError } = await supabase
      .from('commission_levels')
      .select('is_default, type')
      .eq('id', id)
      .single();
    
    if (levelError) {
      console.error("Error fetching commission level:", levelError);
      throw levelError;
    }
    
    if (levelData.is_default) {
      throw new Error("Cannot delete default commission level");
    }
    
    // Supprimer les taux associés
    await supabase
      .from('commission_rates')
      .delete()
      .eq('commission_level_id', id);
    
    // Supprimer le niveau
    const { error } = await supabase
      .from('commission_levels')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error("Error deleting commission level:", error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error:", error);
    return false;
  }
};

/**
 * Crée ou met à jour un taux de commission
 */
export const upsertCommissionRate = async (
  levelId: string,
  minAmount: number,
  maxAmount: number,
  rate: number,
  rateId?: string
): Promise<CommissionRate | null> => {
  try {
    if (rateId) {
      // Mise à jour
      const { data, error } = await supabase
        .from('commission_rates')
        .update({
          min_amount: minAmount,
          max_amount: maxAmount,
          rate
        })
        .eq('id', rateId)
        .select();
      
      if (error) {
        console.error("Error updating commission rate:", error);
        throw error;
      }
      
      return data[0] || null;
    } else {
      // Création
      const { data, error } = await supabase
        .from('commission_rates')
        .insert([
          {
            commission_level_id: levelId,
            min_amount: minAmount,
            max_amount: maxAmount,
            rate
          }
        ])
        .select();
      
      if (error) {
        console.error("Error creating commission rate:", error);
        throw error;
      }
      
      return data[0] || null;
    }
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
};

/**
 * Supprime un taux de commission
 */
export const deleteCommissionRate = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('commission_rates')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error("Error deleting commission rate:", error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error:", error);
    return false;
  }
};

/**
 * Récupère le niveau de commission d'un ambassadeur
 */
export const getAmbassadorCommissionLevel = async (ambassadorId: string): Promise<CommissionLevel | null> => {
  try {
    console.log(`[getAmbassadorCommissionLevel] Fetching commission level for ambassador: ${ambassadorId}`);
    const { data: ambassador, error: ambassadorError } = await supabase
      .from('ambassadors')
      .select('commission_level_id')
      .eq('id', ambassadorId)
      .single();
    
    if (ambassadorError) {
      console.error("[getAmbassadorCommissionLevel] Error fetching ambassador:", ambassadorError);
      throw ambassadorError;
    }
    
    if (!ambassador || !ambassador.commission_level_id) {
      console.log("[getAmbassadorCommissionLevel] Ambassador has no commission level assigned, getting default");
      return getDefaultCommissionLevel('ambassador');
    }
    
    const { data: level, error: levelError } = await supabase
      .from('commission_levels')
      .select('*')
      .eq('id', ambassador.commission_level_id)
      .single();
    
    if (levelError) {
      console.error("[getAmbassadorCommissionLevel] Error fetching commission level:", levelError);
      throw levelError;
    }
    
    console.log("[getAmbassadorCommissionLevel] Found level:", level);
    return level;
  } catch (error) {
    console.error("[getAmbassadorCommissionLevel] Error:", error);
    return null;
  }
};
