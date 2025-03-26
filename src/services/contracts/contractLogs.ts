
import { supabase } from "@/integrations/supabase/client";

/**
 * Récupère les logs de workflow d'un contrat
 */
export const getContractWorkflowLogs = async (contractId: string): Promise<any[]> => {
  try {
    console.log("Récupération des logs pour le contrat:", contractId);
    
    const { data, error } = await supabase
      .from('contract_workflow_logs')
      .select(`
        id,
        contract_id,
        user_id,
        previous_status,
        new_status,
        reason,
        created_at,
        user_name
      `)
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erreur lors de la récupération des logs:", error);
      return [];
    }

    console.log("Logs récupérés:", data);
    return data || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des logs:", error);
    return [];
  }
};
