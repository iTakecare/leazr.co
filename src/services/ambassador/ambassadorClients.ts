
import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/types/client";

// Obtenir les clients d'un ambassadeur
export const getAmbassadorClients = async (): Promise<Client[]> => {
  try {
    console.log("Loading ambassador clients using RLS...");
    
    // D'abord récupérer les liens ambassador_clients avec RLS
    const { data: ambassadorClientsData, error: ambassadorClientsError } = await supabase
      .from('ambassador_clients')
      .select('client_id');
    
    if (ambassadorClientsError) {
      console.error("Error loading ambassador clients:", ambassadorClientsError);
      throw new Error(`Erreur de base de données: ${ambassadorClientsError.message}`);
    }
    
    console.log("Raw ambassador_clients data:", ambassadorClientsData);
    
    if (!ambassadorClientsData || ambassadorClientsData.length === 0) {
      console.log("No client links found for this ambassador");
      return [];
    }
    
    // Extraire les IDs des clients
    const clientIds = ambassadorClientsData.map(item => item.client_id);
    console.log("Client IDs:", clientIds);
    
    // Récupérer les détails des clients en utilisant les IDs
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .in('id', clientIds);
    
    if (clientsError) {
      console.error("Error loading clients details:", clientsError);
      throw new Error(`Erreur de base de données: ${clientsError.message}`);
    }
    
    // Marquer les clients comme clients d'ambassadeur
    const processedClients = clientsData?.map(client => ({
      ...client,
      is_ambassador_client: true
    })) || [];
    
    console.log("Processed clients:", processedClients.length, processedClients);
    return processedClients;
  } catch (error) {
    console.error("Error loading ambassador clients:", error);
    throw error;
  }
};

// Supprimer un client ambassadeur
export const deleteAmbassadorClient = async (clientId: string): Promise<boolean> => {
  try {
    // Utiliser RLS pour supprimer - les politiques vérifieront automatiquement les permissions
    const { error: linkError } = await supabase
      .from("ambassador_clients")
      .delete()
      .eq("client_id", clientId);

    if (linkError) {
      console.error("Error deleting ambassador client link:", linkError);
      throw linkError;
    }

    return true;
  } catch (error) {
    console.error("Error deleting ambassador client:", error);
    throw error;
  }
};
