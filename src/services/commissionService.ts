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
