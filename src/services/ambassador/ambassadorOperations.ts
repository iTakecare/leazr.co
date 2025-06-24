
import { supabase } from "@/integrations/supabase/client";
import { CreateClientData } from "@/types/client";

// Associer un client à un ambassadeur en utilisant la fonction sécurisée
export const linkClientToAmbassador = async (clientId: string): Promise<boolean> => {
  try {
    if (!clientId) {
      console.error("Client ID is missing:", { clientId });
      return false;
    }
    
    console.log("Linking client to ambassador using secure function:", { clientId });
    
    // Utiliser la fonction sécurisée
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }

    const { data, error } = await supabase
      .rpc('link_client_to_ambassador_secure', {
        p_user_id: user.id,
        p_client_id: clientId
      });
    
    if (error) {
      console.error("Error linking client to ambassador:", error);
      throw error;
    }
    
    console.log("Successfully linked client to ambassador");
    return data;
  } catch (error) {
    console.error("Exception in linkClientToAmbassador:", error);
    return false;
  }
};

// Délier un client d'un ambassadeur en utilisant la fonction sécurisée
export const unlinkClientFromAmbassador = async (clientId: string): Promise<boolean> => {
  try {
    if (!clientId) {
      console.error("Client ID is missing:", { clientId });
      return false;
    }
    
    console.log("Unlinking client from ambassador using secure function:", { clientId });
    
    // Utiliser la fonction sécurisée
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }

    const { data, error } = await supabase
      .rpc('unlink_client_from_ambassador_secure', {
        p_user_id: user.id,
        p_client_id: clientId
      });
    
    if (error) {
      console.error("Error unlinking client from ambassador:", error);
      throw error;
    }
    
    console.log("Successfully unlinked client from ambassador");
    return data;
  } catch (error) {
    console.error("Exception in unlinkClientFromAmbassador:", error);
    return false;
  }
};

// Mettre à jour le compteur de clients d'un ambassadeur en utilisant la fonction sécurisée
export const updateAmbassadorClientCount = async (): Promise<boolean> => {
  try {
    // Utiliser la fonction sécurisée pour compter
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }

    const { data: count, error: countError } = await supabase
      .rpc('count_ambassador_clients_secure', { p_user_id: user.id });
    
    if (countError) {
      console.error("Error counting ambassador clients:", countError);
      return false;
    }
    
    console.log(`Ambassador has ${count} clients`);
    
    // Mettre à jour le compteur dans la table ambassadors
    const { error: updateError } = await supabase
      .from("ambassadors")
      .update({ clients_count: count || 0 })
      .eq("user_id", user.id);
    
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
export const createClientAsAmbassadorDb = async (clientData: CreateClientData): Promise<string | null> => {
  try {
    console.log("🔍 DIAGNOSTIC - createClientAsAmbassadorDb:", { clientData });
    
    // Vérifier l'utilisateur authentifié
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }

    // Trouver l'ambassadeur pour cet utilisateur
    const { data: ambassadorData, error: ambassadorError } = await supabase
      .from("ambassadors")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (ambassadorError || !ambassadorData) {
      console.error("🔍 DIAGNOSTIC - Ambassadeur non trouvé:", ambassadorError);
      throw new Error("Profil ambassadeur non trouvé");
    }

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
      ambassador_id: ambassadorData.id
    });
    
    const { data, error } = await supabase
      .rpc('create_client_as_ambassador', {
        client_data: enhancedClientData,
        ambassador_id: ambassadorData.id
      });
    
    console.log("🔍 DIAGNOSTIC - Résultat RPC:", { data, error: error?.message });
    
    if (error) {
      console.error("🔍 DIAGNOSTIC - Erreur lors de la création du client via RPC:", error);
      throw error;
    }
    
    // Mettre à jour le compteur de clients de l'ambassadeur après la création réussie
    await updateAmbassadorClientCount();
    
    console.log("🔍 DIAGNOSTIC - Client créé avec succès via fonction RPC:", data);
    return data;
  } catch (error) {
    console.error("🔍 DIAGNOSTIC - Exception dans createClientAsAmbassadorDb:", error);
    return null;
  }
};
