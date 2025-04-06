
import { supabase } from "@/integrations/supabase/client";

export interface CommissionRateInfo {
  min_amount: number;
  max_amount: number;
  rate: number;
}

export interface CommissionLevelInfo {
  id: string;
  name: string;
  is_default: boolean;
  type: string;
  rates: CommissionRateInfo[];
}

export const getAmbassadorCommissionInfo = async (ambassadorId: string): Promise<CommissionLevelInfo | null> => {
  try {
    console.log(`Récupération des informations de commission pour l'ambassadeur: ${ambassadorId}`);
    
    // Récupérer les informations de l'ambassadeur, notamment son niveau de commission
    const { data: ambassador, error: ambassadorError } = await supabase
      .from('ambassadors')
      .select('commission_level_id, name')
      .eq('id', ambassadorId)
      .single();
    
    if (ambassadorError) {
      console.error("Erreur lors de la récupération des informations de l'ambassadeur:", ambassadorError);
      return null;
    }
    
    if (!ambassador || !ambassador.commission_level_id) {
      console.log("L'ambassadeur n'a pas de niveau de commission assigné ou n'existe pas");
      
      // Essayer de récupérer le niveau par défaut
      const { data: defaultLevel, error: defaultLevelError } = await supabase
        .from('commission_levels')
        .select('id, name, is_default, type')
        .eq('type', 'ambassador')
        .eq('is_default', true)
        .single();
        
      if (defaultLevelError) {
        console.error("Erreur lors de la récupération du niveau de commission par défaut:", defaultLevelError);
        return null;
      }
      
      if (!defaultLevel) {
        console.log("Aucun niveau de commission par défaut trouvé");
        return null;
      }
      
      console.log(`Niveau de commission par défaut utilisé: ${defaultLevel.name} (${defaultLevel.id})`);
      
      // Récupérer les taux pour ce niveau par défaut
      const { data: rates, error: ratesError } = await supabase
        .from('commission_rates')
        .select('min_amount, max_amount, rate')
        .eq('commission_level_id', defaultLevel.id)
        .order('min_amount', { ascending: true });
        
      if (ratesError) {
        console.error("Erreur lors de la récupération des taux de commission:", ratesError);
        return null;
      }
      
      return {
        ...defaultLevel,
        rates: rates || []
      };
    }
    
    // Récupérer les informations du niveau de commission
    const { data: level, error: levelError } = await supabase
      .from('commission_levels')
      .select('id, name, is_default, type')
      .eq('id', ambassador.commission_level_id)
      .single();
      
    if (levelError) {
      console.error("Erreur lors de la récupération du niveau de commission:", levelError);
      return null;
    }
    
    console.log(`Niveau de commission trouvé: ${level.name} (${level.id})`);
    
    // Récupérer les taux pour ce niveau
    const { data: rates, error: ratesError } = await supabase
      .from('commission_rates')
      .select('min_amount, max_amount, rate')
      .eq('commission_level_id', level.id)
      .order('min_amount', { ascending: true });
      
    if (ratesError) {
      console.error("Erreur lors de la récupération des taux de commission:", ratesError);
      return null;
    }
    
    console.log(`${rates?.length || 0} taux de commission trouvés`);
    
    return {
      ...level,
      rates: rates || []
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des informations de commission:", error);
    return null;
  }
};
