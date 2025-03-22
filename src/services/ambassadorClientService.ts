
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreateClientData } from "@/types/client";

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
      .eq('user_id', userData.user.id)
      .maybeSingle();
    
    if (ambassadorError) {
      console.error("Error fetching ambassador data:", ambassadorError);
      return null;
    }
    
    if (!ambassadorData?.id) {
      console.error("No ambassador profile found for user", userData.user.id);
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
export const getAmbassadorClients = async (): Promise<any[]> => {
  try {
    const ambassadorId = await getCurrentAmbassadorProfile();
    
    if (!ambassadorId) {
      console.error("Failed to get ambassador ID");
      return [];
    }
    
    console.log("Loading clients for ambassador:", ambassadorId);
    
    const { data, error } = await supabase
      .from("ambassador_clients")
      .select(`
        id,
        client_id,
        clients:client_id(*)
      `)
      .eq("ambassador_id", ambassadorId);
    
    if (error) {
      console.error("Error loading ambassador clients:", error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log("No clients found for this ambassador");
      return [];
    }
    
    const processedClients = data
      .filter(item => item.clients) // Filter out any null client references
      .map(item => ({
        ...item.clients,
        ambassador_client_id: item.id
      }));
    
    console.log("Processed clients:", processedClients);
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
    
    // Créer le lien en utilisant le client supabase standard (les politiques RLS sont maintenant configurées)
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
    
    console.log("Successfully linked client to ambassador");
    return true;
  } catch (error) {
    console.error("Exception in linkClientToAmbassador:", error);
    return false;
  }
};

// Créer un client en tant qu'ambassadeur en utilisant une fonction SECURITY DEFINER
export const createClientAsAmbassadorDb = async (clientData: CreateClientData, ambassadorId: string): Promise<string | null> => {
  try {
    console.log("Using database function to create client as ambassador:", { ambassadorId, clientData });
    
    const { data, error } = await supabase
      .rpc('create_client_as_ambassador', {
        client_data: clientData,
        ambassador_id: ambassadorId
      });
    
    if (error) {
      console.error("Error creating client through RPC:", error);
      throw error;
    }
    
    console.log("Client created successfully through RPC function:", data);
    return data;
  } catch (error) {
    console.error("Exception in createClientAsAmbassadorDb:", error);
    return null;
  }
};
