import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreateClientData, Client } from "@/types/client";

// Obtenir le profil ambassadeur de l'utilisateur actuel
export const getCurrentAmbassadorProfile = async (): Promise<string | null> => {
  try {
    console.log("Getting current ambassador profile using RLS");
    
    // Utiliser directement la requête avec RLS - les politiques se chargeront de filtrer par auth.uid()
    const { data: ambassadorData, error: ambassadorError } = await supabase
      .from('ambassadors')
      .select('id')
      .maybeSingle();
    
    if (ambassadorError) {
      console.error("Error fetching ambassador data:", ambassadorError);
      return null;
    }
    
    if (!ambassadorData) {
      console.error("No ambassador profile found for current user");
      return null;
    }
    
    console.log("Ambassador found:", ambassadorData.id);
    return ambassadorData.id;
  } catch (error) {
    console.error("Error getting ambassador profile:", error);
    return null;
  }
};

// Obtenir les clients d'un ambassadeur
export const getAmbassadorClients = async (ambassadorId?: string): Promise<Client[]> => {
  try {
    console.log("Loading ambassador clients using RLS...");
    
    // Utiliser directement RLS - pas besoin de spécifier l'ambassador_id
    // Les politiques RLS filtreront automatiquement par l'utilisateur connecté
    const { data, error } = await supabase
      .from('ambassador_clients')
      .select(`
        id,
        client_id,
        clients (*)
      `);
    
    if (error) {
      console.error("Error loading ambassador clients:", error);
      throw new Error(`Erreur de base de données: ${error.message}`);
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

    // Obtenir l'ID ambassadeur pour mettre à jour le compteur
    const ambassadorId = await getCurrentAmbassadorProfile();
    if (ambassadorId) {
      await updateAmbassadorClientCount(ambassadorId);
    }

    return true;
  } catch (error) {
    console.error("Error deleting ambassador client:", error);
    throw error;
  }
};
