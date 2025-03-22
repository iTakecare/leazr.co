
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Client } from "@/types/client";

/**
 * Récupère le profil ambassadeur de l'utilisateur connecté
 */
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
      .single();
    
    if (ambassadorError) {
      console.error("Error fetching ambassador data:", ambassadorError);
      if (ambassadorError.code === 'PGRST116') {
        console.log("No ambassador profile found for this user");
      }
      return null;
    }
    
    console.log("Ambassador found:", ambassadorData?.id);
    return ambassadorData?.id || null;
  } catch (error) {
    console.error("Error getting ambassador profile:", error);
    return null;
  }
};

/**
 * Associe un client à un ambassadeur
 */
export const linkClientToAmbassador = async (clientId: string, ambassadorId: string): Promise<boolean> => {
  try {
    console.log("🔗 Linking client to ambassador:", { clientId, ambassadorId });
    
    if (!clientId || !ambassadorId) {
      console.error("🚫 Missing required parameters for linkClientToAmbassador", { clientId, ambassadorId });
      return false;
    }
    
    // Vérifier si le lien existe déjà
    const { data: existingLinks, error: checkError } = await supabase
      .from("ambassador_clients")
      .select("*")
      .eq("ambassador_id", ambassadorId)
      .eq("client_id", clientId);
      
    if (checkError) {
      console.error("🚫 Error checking existing ambassador-client links:", checkError);
      
      // Log l'erreur complète pour diagnostic
      await supabase.from("error_logs").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        error_context: "linkClientToAmbassador:check_existing",
        error_message: JSON.stringify(checkError),
        request_data: { clientId, ambassadorId }
      });
      
      return false;
    }
    
    // Si le lien existe déjà, considérer l'opération comme réussie
    if (existingLinks && existingLinks.length > 0) {
      console.log("✅ Client is already linked to this ambassador");
      return true;
    }
    
    // Créer le lien
    const { error: insertError } = await supabase
      .from("ambassador_clients")
      .insert({
        ambassador_id: ambassadorId,
        client_id: clientId
      });
    
    if (insertError) {
      console.error("🚫 Error linking client to ambassador:", insertError);
      
      // Log l'erreur complète pour diagnostic
      await supabase.from("error_logs").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        error_context: "linkClientToAmbassador:insert",
        error_message: JSON.stringify(insertError),
        request_data: { clientId, ambassadorId }
      });
      
      return false;
    }
    
    console.log("✅ Client successfully linked to ambassador");
    return true;
  } catch (error) {
    console.error("🚫 Exception when linking client to ambassador:", error);
    return false;
  }
};

/**
 * Récupère les clients d'un ambassadeur
 */
export const getAmbassadorClients = async (): Promise<Client[]> => {
  try {
    const ambassadorId = await getCurrentAmbassadorProfile();
    if (!ambassadorId) {
      console.error("Could not find ambassador profile");
      return [];
    }
    
    // Récupérer les IDs des clients liés à cet ambassadeur
    const { data: clientLinks, error: linksError } = await supabase
      .from('ambassador_clients')
      .select('client_id')
      .eq('ambassador_id', ambassadorId);
    
    if (linksError) {
      console.error("Error fetching ambassador client links:", linksError);
      return [];
    }
    
    if (!clientLinks || clientLinks.length === 0) {
      console.log("No clients found for this ambassador");
      return [];
    }
    
    // Extraire les IDs des clients
    const clientIds = clientLinks.map(link => link.client_id);
    
    // Récupérer les détails des clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .in('id', clientIds);
    
    if (clientsError) {
      console.error("Error fetching client details:", clientsError);
      return [];
    }
    
    // Mapper les données de la base de données au type Client
    return clients ? clients.map(client => ({
      id: client.id,
      name: client.name,
      email: client.email || '',
      company: client.company || '',
      phone: client.phone || '',
      address: client.address || '',
      notes: client.notes || '',
      status: client.status || 'active',
      vat_number: client.vat_number || '',
      city: client.city || '',
      postal_code: client.postal_code || '',
      country: client.country || '',
      collaborators: [],
      user_id: client.user_id,
      has_user_account: client.has_user_account || false,
      user_account_created_at: client.user_account_created_at,
      created_at: client.created_at ? new Date(client.created_at) : new Date(),
      updated_at: client.updated_at ? new Date(client.updated_at) : new Date()
    })) : [];
  } catch (error) {
    console.error("Error in getAmbassadorClients:", error);
    return [];
  }
};
