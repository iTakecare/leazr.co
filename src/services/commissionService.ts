
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CommissionLevel {
  id: string;
  name: string;
  type: 'partner' | 'ambassador';
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
  rates?: CommissionRate[];
}

export interface CommissionRate {
  id: string;
  level_id: string;
  min_amount: number;
  max_amount: number;
  rate: number;
  created_at?: string;
  updated_at?: string;
}

export const getCommissionLevels = async (type?: 'partner' | 'ambassador'): Promise<CommissionLevel[]> => {
  try {
    let query = supabase
      .from('commission_levels')
      .select('*');
    
    if (type) {
      query = query.eq('type', type);
    }
    
    const { data, error } = await query.order('name');
    
    if (error) {
      console.error("Error fetching commission levels:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in getCommissionLevels:", error);
    return [];
  }
};

export const getCommissionRates = async (levelId: string): Promise<CommissionRate[]> => {
  try {
    const { data, error } = await supabase
      .from('commission_rates')
      .select('*')
      .eq('level_id', levelId)
      .order('min_amount', { ascending: false });
    
    if (error) {
      console.error("Error fetching commission rates:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in getCommissionRates:", error);
    return [];
  }
};

export const getCommissionLevelWithRates = async (levelId: string): Promise<CommissionLevel | null> => {
  try {
    // Fetch the level
    const { data: levelData, error: levelError } = await supabase
      .from('commission_levels')
      .select('*')
      .eq('id', levelId)
      .single();
    
    if (levelError) {
      throw levelError;
    }
    
    if (!levelData) {
      return null;
    }
    
    // Fetch the rates
    const rates = await getCommissionRates(levelId);
    
    return {
      ...levelData,
      rates
    };
  } catch (error) {
    console.error("Error in getCommissionLevelWithRates:", error);
    return null;
  }
};

export const createCommissionLevel = async (level: Omit<CommissionLevel, 'id' | 'created_at' | 'updated_at'>): Promise<CommissionLevel | null> => {
  try {
    const { data, error } = await supabase
      .from('commission_levels')
      .insert({
        name: level.name,
        type: level.type,
        is_default: level.is_default
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error creating commission level:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error in createCommissionLevel:", error);
    toast.error("Erreur lors de la création du niveau de commission");
    return null;
  }
};

export const updateCommissionLevel = async (id: string, level: Partial<CommissionLevel>): Promise<CommissionLevel | null> => {
  try {
    const { data, error } = await supabase
      .from('commission_levels')
      .update({
        name: level.name,
        is_default: level.is_default,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error("Error updating commission level:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error in updateCommissionLevel:", error);
    toast.error("Erreur lors de la mise à jour du niveau de commission");
    return null;
  }
};

export const deleteCommissionLevel = async (id: string): Promise<boolean> => {
  try {
    // First check if this is a default level
    const { data: levelData, error: levelError } = await supabase
      .from('commission_levels')
      .select('is_default')
      .eq('id', id)
      .single();
    
    if (levelError) {
      throw levelError;
    }
    
    if (levelData?.is_default) {
      toast.error("Impossible de supprimer un niveau par défaut");
      return false;
    }
    
    // Delete the level (cascade will delete the rates)
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
    console.error("Error in deleteCommissionLevel:", error);
    toast.error("Erreur lors de la suppression du niveau de commission");
    return false;
  }
};

export const createCommissionRate = async (rate: Omit<CommissionRate, 'id' | 'created_at' | 'updated_at'>): Promise<CommissionRate | null> => {
  try {
    const { data, error } = await supabase
      .from('commission_rates')
      .insert({
        level_id: rate.level_id,
        min_amount: rate.min_amount,
        max_amount: rate.max_amount,
        rate: rate.rate
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error creating commission rate:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error in createCommissionRate:", error);
    toast.error("Erreur lors de la création du taux de commission");
    return null;
  }
};

export const updateCommissionRate = async (id: string, rate: Partial<CommissionRate>): Promise<CommissionRate | null> => {
  try {
    const { data, error } = await supabase
      .from('commission_rates')
      .update({
        min_amount: rate.min_amount,
        max_amount: rate.max_amount,
        rate: rate.rate,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error("Error updating commission rate:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error in updateCommissionRate:", error);
    toast.error("Erreur lors de la mise à jour du taux de commission");
    return null;
  }
};

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
    console.error("Error in deleteCommissionRate:", error);
    toast.error("Erreur lors de la suppression du taux de commission");
    return false;
  }
};

export const setDefaultCommissionLevel = async (id: string, type: 'partner' | 'ambassador'): Promise<boolean> => {
  try {
    // First, remove default status from all levels of this type
    const { error: updateError } = await supabase
      .from('commission_levels')
      .update({ is_default: false })
      .eq('type', type);
    
    if (updateError) {
      throw updateError;
    }
    
    // Then set the new default
    const { error } = await supabase
      .from('commission_levels')
      .update({ is_default: true })
      .eq('id', id);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error in setDefaultCommissionLevel:", error);
    toast.error("Erreur lors de la définition du niveau par défaut");
    return false;
  }
};

export const getDefaultCommissionLevel = async (type: 'partner' | 'ambassador'): Promise<CommissionLevel | null> => {
  try {
    const { data, error } = await supabase
      .from('commission_levels')
      .select('*')
      .eq('type', type)
      .eq('is_default', true)
      .single();
    
    if (error) {
      console.error("Error fetching default commission level:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error in getDefaultCommissionLevel:", error);
    return null;
  }
};

// Nouvelle fonction pour calculer le taux de commission en fonction du montant
export const calculateCommissionRate = async (amount: number, levelId: string): Promise<number> => {
  try {
    const rates = await getCommissionRates(levelId);
    
    const matchingRate = rates.find(
      rate => amount >= rate.min_amount && amount <= rate.max_amount
    );
    
    return matchingRate?.rate || 0;
  } catch (error) {
    console.error("Error in calculateCommissionRate:", error);
    return 0;
  }
};

// Nouvelle fonction pour calculer le montant de la commission
export const calculateCommissionAmount = async (amount: number, levelId: string): Promise<number> => {
  try {
    const rate = await calculateCommissionRate(amount, levelId);
    return (amount * rate) / 100;
  } catch (error) {
    console.error("Error in calculateCommissionAmount:", error);
    return 0;
  }
};
