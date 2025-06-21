
import { supabase } from "@/integrations/supabase/client";
import { CreateClientData } from "@/types/client";

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
    console.log("🔍 DIAGNOSTIC - createClientAsAmbassadorDb:", { ambassadorId, clientData });
    
    // Vérifier que la fonction existe
    const { data: functionExists } = await supabase.rpc('check_function_exists', {
      function_name: 'create_client_as_ambassador'
    });
    
    console.log("🔍 DIAGNOSTIC - Fonction existe:", functionExists);
    
    if (!functionExists) {
      console.error("🔍 DIAGNOSTIC - La fonction create_client_as_ambassador n'existe pas");
      throw new Error("La fonction de création de client ambassadeur n'est pas disponible");
    }
    
    // Ajouter is_ambassador_client: true aux données du client pour le marquer correctement
    const enhancedClientData = {
      ...clientData,
      is_ambassador_client: true
    };
    
    console.log("🔍 DIAGNOSTIC - Appel de la fonction RPC avec:", {
      client_data: enhancedClientData,
      ambassador_id: ambassadorId
    });
    
    const { data, error } = await supabase
      .rpc('create_client_as_ambassador', {
        client_data: enhancedClientData,
        ambassador_id: ambassadorId
      });
    
    console.log("🔍 DIAGNOSTIC - Résultat RPC:", { data, error: error?.message });
    
    if (error) {
      console.error("🔍 DIAGNOSTIC - Erreur lors de la création du client via RPC:", error);
      throw error;
    }
    
    // Mettre à jour le compteur de clients de l'ambassadeur après la création réussie
    await updateAmbassadorClientCount(ambassadorId);
    
    console.log("🔍 DIAGNOSTIC - Client créé avec succès via fonction RPC:", data);
    return data;
  } catch (error) {
    console.error("🔍 DIAGNOSTIC - Exception dans createClientAsAmbassadorDb:", error);
    return null;
  }
};
