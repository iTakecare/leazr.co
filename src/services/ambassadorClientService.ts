import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreateClientData, Client } from "@/types/client";

// Obtenir le profil ambassadeur de l'utilisateur actuel
export const getCurrentAmbassadorProfile = async (): Promise<string | null> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData?.user) {
      console.error("No authenticated user found:", userError);
      return null;
    }
    
    console.log("Current user:", userData.user.id);
    
    const { data: ambassadorData, error: ambassadorError } = await supabase
      .from('ambassadors')
      .select('id')
      .eq('user_id', userData.user.id);
    
    if (ambassadorError) {
      console.error("Error fetching ambassador data:", ambassadorError);
      return null;
    }
    
    if (!ambassadorData || ambassadorData.length === 0) {
      console.error("No ambassador profile found for user", userData.user.id);
      return null;
    }
    
    console.log("Ambassador found:", ambassadorData[0].id);
    return ambassadorData[0].id;
  } catch (error) {
    console.error("Error getting ambassador profile:", error);
    return null;
  }
};

// Obtenir les clients d'un ambassadeur
export const getAmbassadorClients = async (ambassadorId?: string): Promise<Client[]> => {
  try {
    let ambassadorIdToUse = ambassadorId;
    
    if (!ambassadorIdToUse) {
      ambassadorIdToUse = await getCurrentAmbassadorProfile();
    }
    
    if (!ambassadorIdToUse) {
      console.error("Failed to get ambassador ID");
      return [];
    }
    
    console.log("Loading clients for ambassador:", ambassadorIdToUse);
    
    // Join ambassador_clients with clients to get the full client data
    const { data, error } = await supabase
      .from('ambassador_clients')
      .select(`
        id,
        client_id,
        clients (*)
      `)
      .eq('ambassador_id', ambassadorIdToUse);
    
    if (error) {
      console.error("Error loading ambassador clients:", error);
      throw error;
    }
    
    console.log("Raw data from ambassador_clients:", data);
    
    if (!data || data.length === 0) {
      console.log("No clients found for this ambassador");
      return [];
    }
    
    // Process the joined data to extract client information
    const processedClients = data
      .filter(item => item.clients) // Filter out any null client references
      .map(item => ({
        ...item.clients,
        ambassador_client_id: item.id,
        is_ambassador_client: true
      }));
    
    console.log("Processed clients:", processedClients.length, processedClients);
    return processedClients;
  } catch (error) {
    console.error("Error loading ambassador clients:", error);
    throw error;
  }
};

// Associer un client à un ambassadeur
export const linkClientToAmbassador = async (clientId: string, ambassadorId: string): Promise<boolean> => {
  try {
    if (!clientId || !ambassadorId) {
      console.error("Client ID or Ambassador ID is missing:", { clientId, ambassadorId });
      return false;
    }
    
    console.log("Linking client to ambassador:", { clientId, ambassadorId });
    
    // Vérifier si le lien existe déjà pour éviter les doublons
    const { data: existingLinks, error: checkError } = await supabase
      .from("ambassador_clients")
      .select("*")
      .eq("ambassador_id", ambassadorId)
      .eq("client_id", clientId);
    
    if (checkError) {
      console.error("Error checking existing links:", checkError);
      throw checkError;
    }
    
    if (existingLinks && existingLinks.length > 0) {
      console.log("Link already exists:", existingLinks[0]);
      return true;
    }
    
    // Créer le lien en utilisant le client supabase standard
    const { error: insertError } = await supabase
      .from("ambassador_clients")
      .insert({
        ambassador_id: ambassadorId,
        client_id: clientId
      });
    
    if (insertError) {
      console.error("Error linking client to ambassador:", insertError);
      throw insertError;
    }
    
    // Mettre à jour le client pour indiquer qu'il appartient à un ambassadeur
    const { error: updateClientError } = await supabase
      .from("clients")
      .update({ is_ambassador_client: true })
      .eq("id", clientId);
    
    if (updateClientError) {
      console.error("Error updating client:", updateClientError);
      // Continue anyway, this is not critical
    }
    
    // Mettre à jour le compteur de clients de l'ambassadeur
    await updateAmbassadorClientCount(ambassadorId);
    
    console.log("Successfully linked client to ambassador");
    return true;
  } catch (error) {
    console.error("Exception in linkClientToAmbassador:", error);
    return false;
  }
};

// Mettre à jour le compteur de clients d'un ambassadeur
export const updateAmbassadorClientCount = async (ambassadorId: string): Promise<boolean> => {
  try {
    // Compter le nombre de clients liés à cet ambassadeur
    const { count, error: countError } = await supabase
      .from("ambassador_clients")
      .select("*", { count: "exact", head: true })
      .eq("ambassador_id", ambassadorId);
    
    if (countError) {
      console.error("Error counting ambassador clients:", countError);
      return false;
    }
    
    console.log(`Ambassador ${ambassadorId} has ${count} clients`);
    
    // Mettre à jour le compteur dans la table ambassadors
    const { error: updateError } = await supabase
      .from("ambassadors")
      .update({ clients_count: count || 0 })
      .eq("id", ambassadorId);
    
    if (updateError) {
      console.error("Error updating ambassador client count:", updateError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error updating ambassador client count:", error);
    return false;
  }
};

// Créer un client en tant qu'ambassadeur en utilisant une fonction SECURITY DEFINER
export const createClientAsAmbassadorDb = async (clientData: CreateClientData, ambassadorId: string): Promise<string | null> => {
  try {
    console.log("Using database function to create client as ambassador:", { ambassadorId, clientData });
    
    // Ajouter is_ambassador_client: true aux données du client pour le marquer correctement
    const enhancedClientData = {
      ...clientData,
      is_ambassador_client: true
    };
    
    const { data, error } = await supabase
      .rpc('create_client_as_ambassador', {
        client_data: enhancedClientData,
        ambassador_id: ambassadorId
      });
    
    if (error) {
      console.error("Error creating client through RPC:", error);
      throw error;
    }
    
    // Mettre à jour le compteur de clients de l'ambassadeur après la création réussie
    await updateAmbassadorClientCount(ambassadorId);
    
    console.log("Client created successfully through RPC function:", data);
    return data;
  } catch (error) {
    console.error("Exception in createClientAsAmbassadorDb:", error);
    return null;
  }
};

// Supprimer un client d'ambassadeur
export const deleteAmbassadorClient = async (clientId: string): Promise<boolean> => {
  try {
    console.log("Suppression du client ambassadeur:", clientId);
    
    // 1. Récupérer l'ID d'ambassadeur de l'utilisateur actuel
    const ambassadorId = await getCurrentAmbassadorProfile();
    
    if (!ambassadorId) {
      console.error("ID d'ambassadeur introuvable pour l'utilisateur actuel");
      return false;
    }
    
    // 2. Trouver l'ID de la relation ambassador_client
    const { data: linkData, error: linkError } = await supabase
      .from("ambassador_clients")
      .select("id")
      .eq("client_id", clientId)
      .eq("ambassador_id", ambassadorId)
      .single();
    
    if (linkError || !linkData) {
      console.error("Erreur lors de la recherche de la relation ambassadeur-client:", linkError);
      return false;
    }
    
    // 3. Supprimer la relation ambassador_client
    const { error: deleteRelationError } = await supabase
      .from("ambassador_clients")
      .delete()
      .eq("id", linkData.id);
    
    if (deleteRelationError) {
      console.error("Erreur lors de la suppression de la relation ambassadeur-client:", deleteRelationError);
      return false;
    }
    
    // 4. Supprimer le client
    const { error: deleteClientError } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientId);
    
    if (deleteClientError) {
      console.error("Erreur lors de la suppression du client:", deleteClientError);
      return false;
    }
    
    // 5. Mettre à jour le compteur de clients pour l'ambassadeur
    await updateAmbassadorClientCount(ambassadorId);
    
    console.log("Client supprimé avec succès");
    return true;
  } catch (error) {
    console.error("Exception lors de la suppression du client:", error);
    return false;
  }
};
