
import { supabase } from "@/integrations/supabase/client";

export interface CommissionRate {
  id: string;
  commission_level_id: string;
  min_amount: number;
  max_amount: number;
  rate: number;
  created_at: string;
}

export interface CommissionLevel {
  id: string;
  name: string;
  type: string;
  is_default: boolean;
  created_at: string;
  rates?: CommissionRate[];
}

// Récupérer un niveau de commission par ID avec ses taux associés
export const getCommissionLevelWithRates = async (
  id: string
): Promise<CommissionLevel | null> => {
  try {
    const { data: level, error: levelError } = await supabase
      .from("commission_levels")
      .select("*")
      .eq("id", id)
      .single();

    if (levelError) throw levelError;

    if (!level) {
      console.warn(`Commission level with ID ${id} not found.`);
      return null;
    }

    const { data: rates, error: ratesError } = await supabase
      .from("commission_rates")
      .select("*")
      .eq("commission_level_id", id);

    if (ratesError) throw ratesError;

    const commissionLevelWithRates: CommissionLevel = {
      ...level,
      rates: rates || [],
    };

    return commissionLevelWithRates;
  } catch (error) {
    console.error("Error fetching commission level with rates:", error);
    return null;
  }
};

// Récupérer tous les niveaux de commission pour un type donné (ambassador ou partner)
export const getCommissionLevels = async (type: string): Promise<CommissionLevel[]> => {
  try {
    const { data, error } = await supabase
      .from('commission_levels')
      .select('*')
      .eq('type', type)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching commission levels:", error);
    return [];
  }
};

// Récupérer les taux pour un niveau spécifique
export const getCommissionRates = async (levelId: string): Promise<CommissionRate[]> => {
  try {
    const { data, error } = await supabase
      .from('commission_rates')
      .select('*')
      .eq('commission_level_id', levelId)
      .order('min_amount');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching commission rates:", error);
    return [];
  }
};

// Créer un nouveau niveau de commission
export const createCommissionLevel = async (
  levelData: Omit<CommissionLevel, 'id' | 'created_at'>
): Promise<CommissionLevel | null> => {
  try {
    const { data, error } = await supabase
      .from('commission_levels')
      .insert([levelData])
      .select()
      .single();

    if (error) throw error;
    
    // Si ce niveau est défini par défaut, mettre à jour les autres niveaux du même type
    if (levelData.is_default) {
      await setDefaultCommissionLevel(data.id, levelData.type);
    }
    
    return data;
  } catch (error) {
    console.error("Error creating commission level:", error);
    return null;
  }
};

// Mettre à jour un niveau de commission
export const updateCommissionLevel = async (
  id: string,
  levelData: Partial<CommissionLevel>
): Promise<CommissionLevel | null> => {
  try {
    const { data, error } = await supabase
      .from('commission_levels')
      .update(levelData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Si ce niveau est défini par défaut, mettre à jour les autres niveaux du même type
    if (levelData.is_default) {
      const { data: levelInfo } = await supabase
        .from('commission_levels')
        .select('type')
        .eq('id', id)
        .single();
        
      if (levelInfo) {
        await setDefaultCommissionLevel(id, levelInfo.type);
      }
    }
    
    return data;
  } catch (error) {
    console.error("Error updating commission level:", error);
    return null;
  }
};

// Supprimer un niveau de commission
export const deleteCommissionLevel = async (id: string): Promise<boolean> => {
  try {
    // Supprimer d'abord les taux associés
    const { error: ratesError } = await supabase
      .from('commission_rates')
      .delete()
      .eq('commission_level_id', id);

    if (ratesError) throw ratesError;

    // Puis supprimer le niveau
    const { error } = await supabase
      .from('commission_levels')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting commission level:", error);
    return false;
  }
};

// Définir un niveau comme niveau par défaut
export const setDefaultCommissionLevel = async (id: string, type: string): Promise<boolean> => {
  try {
    // Mettre à jour tous les autres niveaux du même type pour ne pas être par défaut
    const { error: updateOthersError } = await supabase
      .from('commission_levels')
      .update({ is_default: false })
      .eq('type', type)
      .neq('id', id);

    if (updateOthersError) throw updateOthersError;

    // Mettre à jour ce niveau comme étant par défaut
    const { error } = await supabase
      .from('commission_levels')
      .update({ is_default: true })
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error setting default commission level:", error);
    return false;
  }
};

// Obtenir le niveau de commission par défaut pour un type donné
export const getDefaultCommissionLevel = async (type: string): Promise<CommissionLevel | null> => {
  try {
    const { data, error } = await supabase
      .from('commission_levels')
      .select('*')
      .eq('type', type)
      .eq('is_default', true)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching default commission level:", error);
    return null;
  }
};

// Créer un nouveau taux de commission
export const createCommissionRate = async (
  rateData: Omit<CommissionRate, 'id' | 'created_at'>
): Promise<CommissionRate | null> => {
  try {
    const { data, error } = await supabase
      .from('commission_rates')
      .insert([rateData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating commission rate:", error);
    return null;
  }
};

// Mettre à jour un taux de commission
export const updateCommissionRate = async (
  id: string,
  rateData: Partial<CommissionRate>
): Promise<CommissionRate | null> => {
  try {
    const { data, error } = await supabase
      .from('commission_rates')
      .update(rateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating commission rate:", error);
    return null;
  }
};

// Supprimer un taux de commission
export const deleteCommissionRate = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('commission_rates')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting commission rate:", error);
    return false;
  }
};

// Mettre à jour le niveau de commission d'un ambassadeur
export const updateAmbassadorCommissionLevel = async (
  ambassadorId: string,
  commissionLevelId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('ambassadors')
      .update({ commission_level_id: commissionLevelId })
      .eq('id', ambassadorId);

    if (error) throw error;
  } catch (error) {
    console.error("Error updating ambassador commission level:", error);
    throw error;
  }
};

// Mettre à jour le niveau de commission d'un partenaire
export const updatePartnerCommissionLevel = async (
  partnerId: string,
  commissionLevelId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('partners')
      .update({ commission_level_id: commissionLevelId })
      .eq('id', partnerId);

    if (error) throw error;
  } catch (error) {
    console.error("Error updating partner commission level:", error);
    throw error;
  }
};
