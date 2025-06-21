
import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/types/client";

// Obtenir les clients d'un ambassadeur avec une gestion d'erreur améliorée
export const getAmbassadorClients = async (): Promise<Client[]> => {
  try {
    console.log("Loading ambassador clients using optimized RLS...");
    
    // Utiliser directement la politique RLS pour récupérer les clients
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (clientsError) {
      console.error("Error loading ambassador clients:", clientsError);
      throw new Error(`Erreur de base de données: ${clientsError.message}`);
    }
    
    console.log("Ambassador clients loaded successfully:", clientsData?.length || 0);
    
    // Marquer les clients comme clients d'ambassadeur
    const processedClients = clientsData?.map(client => ({
      ...client,
      is_ambassador_client: true
    })) || [];
    
    return processedClients;
  } catch (error) {
    console.error("Error loading ambassador clients:", error);
    throw error;
  }
};

// Supprimer un client ambassadeur avec gestion d'erreur améliorée
export const deleteAmbassadorClient = async (clientId: string): Promise<boolean> => {
  try {
    console.log("Deleting ambassador client:", clientId);
    
    // Supprimer la relation ambassadeur-client
    const { error: linkError } = await supabase
      .from("ambassador_clients")
      .delete()
      .eq("client_id", clientId);

    if (linkError) {
      console.error("Error deleting ambassador client link:", linkError);
      throw new Error(`Erreur lors de la suppression de la relation: ${linkError.message}`);
    }

    // Supprimer le client lui-même
    const { error: clientError } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientId);

    if (clientError) {
      console.error("Error deleting client:", clientError);
      throw new Error(`Erreur lors de la suppression du client: ${clientError.message}`);
    }

    console.log("Ambassador client deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting ambassador client:", error);
    throw error;
  }
};
