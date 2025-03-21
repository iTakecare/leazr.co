
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
  rates?: CommissionRate[]; // Add rates property that components are expecting
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
export const createCommissionLevel = async (levelData: { name: string; type: 'partner' | 'ambassador'; is_default?: boolean }): Promise<CommissionLevel | null> => {
  try {
    const { name, type, is_default = false } = levelData;
    
    if (is_default) {
      // Si le nouveau niveau est défini comme par défaut, mettre à jour tous les autres niveaux pour les définir comme non par défaut
      await supabase
        .from('commission_levels')
        .update({ is_default: false })
        .eq('type', type);
    }
    
    const { data, error } = await supabase
      .from('commission_levels')
      .insert([
        { name, type, is_default }
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
export const updateCommissionLevel = async (id: string, levelData: { name: string; is_default?: boolean }): Promise<CommissionLevel | null> => {
  try {
    const { name, is_default = false } = levelData;
    
    const { data: levelData_, error: levelError } = await supabase
      .from('commission_levels')
      .select('type')
      .eq('id', id)
      .single();
    
    if (levelError) {
      console.error("Error fetching commission level type:", levelError);
      throw levelError;
    }
    
    const type = levelData_.type;
    
    if (is_default) {
      // Si le niveau est défini comme par défaut, mettre à jour tous les autres niveaux pour les définir comme non par défaut
      await supabase
        .from('commission_levels')
        .update({ is_default: false })
        .eq('type', type);
    }
    
    const { data, error } = await supabase
      .from('commission_levels')
      .update({ name, is_default })
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

/**
 * Met à jour le niveau de commission d'un ambassadeur
 */
export const updateAmbassadorCommissionLevel = async (ambassadorId: string, levelId: string): Promise<boolean> => {
  try {
    console.log(`[updateAmbassadorCommissionLevel] Updating commission level for ambassador ${ambassadorId} to ${levelId}`);
    const { error } = await supabase
      .from('ambassadors')
      .update({ commission_level_id: levelId })
      .eq('id', ambassadorId);
    
    if (error) {
      console.error("[updateAmbassadorCommissionLevel] Error updating ambassador commission level:", error);
      throw error;
    }
    
    console.log("[updateAmbassadorCommissionLevel] Successfully updated");
    return true;
  } catch (error) {
    console.error("[updateAmbassadorCommissionLevel] Error:", error);
    return false;
  }
};

/**
 * Récupère un niveau de commission avec ses taux
 */
export const getCommissionLevelWithRates = async (levelId: string): Promise<CommissionLevel | null> => {
  try {
    console.log(`[getCommissionLevelWithRates] Fetching commission level with rates: ${levelId}`);
    const { data: level, error: levelError } = await supabase
      .from('commission_levels')
      .select('*')
      .eq('id', levelId)
      .single();
    
    if (levelError) {
      console.error("[getCommissionLevelWithRates] Error fetching commission level:", levelError);
      throw levelError;
    }
    
    const rates = await getCommissionRates(levelId);
    
    const levelWithRates: CommissionLevel = {
      ...level,
      rates
    };
    
    console.log("[getCommissionLevelWithRates] Found level with rates:", levelWithRates);
    return levelWithRates;
  } catch (error) {
    console.error("[getCommissionLevelWithRates] Error:", error);
    return null;
  }
};

/**
 * Définit un niveau de commission comme niveau par défaut
 */
export const setDefaultCommissionLevel = async (levelId: string, type: 'partner' | 'ambassador'): Promise<boolean> => {
  try {
    console.log(`[setDefaultCommissionLevel] Setting level ${levelId} as default for ${type}`);
    
    // Désactiver tous les niveaux par défaut existants
    await supabase
      .from('commission_levels')
      .update({ is_default: false })
      .eq('type', type);
    
    // Définir le niveau spécifié comme par défaut
    const { error } = await supabase
      .from('commission_levels')
      .update({ is_default: true })
      .eq('id', levelId);
    
    if (error) {
      console.error("[setDefaultCommissionLevel] Error setting default level:", error);
      throw error;
    }
    
    console.log("[setDefaultCommissionLevel] Successfully set default level");
    return true;
  } catch (error) {
    console.error("[setDefaultCommissionLevel] Error:", error);
    return false;
  }
};

/**
 * Crée un taux de commission
 */
export const createCommissionRate = async (rateData: Omit<CommissionRate, "id" | "created_at">): Promise<CommissionRate | null> => {
  try {
    const { commission_level_id, min_amount, max_amount, rate, updated_at } = rateData;
    
    const { data, error } = await supabase
      .from('commission_rates')
      .insert([{ 
        commission_level_id, 
        min_amount, 
        max_amount, 
        rate,
        updated_at
      }])
      .select();
    
    if (error) {
      console.error("Error creating commission rate:", error);
      throw error;
    }
    
    return data[0] || null;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
};

/**
 * Met à jour un taux de commission
 */
export const updateCommissionRate = async (id: string, rateData: { min_amount?: number; max_amount?: number; rate?: number }): Promise<CommissionRate | null> => {
  try {
    const { min_amount, max_amount, rate } = rateData;
    
    const updateData: any = { updated_at: new Date().toISOString() };
    if (min_amount !== undefined) updateData.min_amount = min_amount;
    if (max_amount !== undefined) updateData.max_amount = max_amount;
    if (rate !== undefined) updateData.rate = rate;
    
    const { data, error } = await supabase
      .from('commission_rates')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error("Error updating commission rate:", error);
      throw error;
    }
    
    return data[0] || null;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
};
