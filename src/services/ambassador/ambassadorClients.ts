
import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/types/client";

// Obtenir les clients d'un ambassadeur en utilisant la fonction SECURITY DEFINER
export const getAmbassadorClients = async (): Promise<Client[]> => {
  try {
    console.log("🔍 DIAGNOSTIC - Début getAmbassadorClients avec fonction SECURITY DEFINER");
    
    // Vérifier l'utilisateur authentifié
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log("🔍 DIAGNOSTIC - Utilisateur authentifié:", {
      userId: user?.id,
      email: user?.email,
      hasUser: !!user,
      userError: userError?.message
    });
    
    if (!user) {
      console.error("🔍 DIAGNOSTIC - Aucun utilisateur authentifié");
      throw new Error("Utilisateur non authentifié");
    }
    
    // Appeler la fonction SECURITY DEFINER pour récupérer les clients
    console.log("🔍 DIAGNOSTIC - Appel de la fonction get_ambassador_clients_secure avec user_id:", user.id);
    
    const { data: clientsData, error: clientsError } = await supabase
      .rpc('get_ambassador_clients_secure', { p_user_id: user.id });
    
    console.log("🔍 DIAGNOSTIC - Résultat de la fonction SECURITY DEFINER:", {
      clientsFound: clientsData?.length || 0,
      clientsData: clientsData,
      clientsError: clientsError?.message,
      clientsErrorCode: clientsError?.code,
      clientsErrorDetails: clientsError?.details
    });
    
    if (clientsError) {
      console.error("🔍 DIAGNOSTIC - Erreur lors de l'appel de la fonction:", clientsError);
      throw new Error(`Erreur fonction: ${clientsError.message}`);
    }
    
    if (!clientsData || clientsData.length === 0) {
      console.log("🔍 DIAGNOSTIC - Aucun client trouvé pour cet ambassadeur");
      return [];
    }
    
    // Transformer les données de la fonction en format Client
    const processedClients: Client[] = clientsData.map(row => ({
      id: row.client_id,
      name: row.client_name,
      email: row.client_email,
      company: row.client_company,
      phone: row.client_phone,
      address: row.client_address,
      city: row.client_city,
      postal_code: row.client_postal_code,
      country: row.client_country,
      vat_number: row.client_vat_number,
      notes: row.client_notes,
      status: row.client_status as any,
      created_at: row.client_created_at,
      updated_at: row.client_updated_at,
      user_id: row.client_user_id,
      has_user_account: row.client_has_user_account,
      company_id: row.client_company_id,
      is_ambassador_client: true,
      // Correction : vérifier si link_created_at existe et est une date valide
      createdAt: row.link_created_at ? (
        typeof row.link_created_at === 'string' ? row.link_created_at : 
        row.link_created_at instanceof Date ? row.link_created_at.toISOString() :
        new Date(row.link_created_at).toISOString()
      ) : undefined
    }));
    
    console.log("🔍 DIAGNOSTIC - Clients traités:", {
      totalProcessed: processedClients.length,
      clients: processedClients.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        status: c.status
      }))
    });
    
    console.log("🔍 DIAGNOSTIC - Fin getAmbassadorClients - Succès avec fonction SECURITY DEFINER");
    return processedClients;
  } catch (error) {
    console.error("🔍 DIAGNOSTIC - Erreur fatale dans getAmbassadorClients:", {
      errorMessage: error instanceof Error ? error.message : 'Erreur inconnue',
      errorStack: error instanceof Error ? error.stack : undefined,
      errorType: typeof error,
      errorObject: error
    });
    throw error;
  }
};

// Supprimer un client ambassadeur
export const deleteAmbassadorClient = async (clientId: string): Promise<boolean> => {
  try {
    console.log("🔍 DIAGNOSTIC - Début deleteAmbassadorClient:", { clientId });
    
    // Vérifier l'utilisateur authentifié
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log("🔍 DIAGNOSTIC - Utilisateur pour suppression:", {
      userId: user?.id,
      email: user?.email,
      userError: userError?.message
    });
    
    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }
    
    // Utiliser RLS pour supprimer - les politiques vérifieront automatiquement les permissions
    const { error: linkError } = await supabase
      .from("ambassador_clients")
      .delete()
      .eq("client_id", clientId);

    console.log("🔍 DIAGNOSTIC - Résultat suppression lien:", {
      success: !linkError,
      error: linkError?.message
    });

    if (linkError) {
      console.error("🔍 DIAGNOSTIC - Erreur lors de la suppression du lien:", linkError);
      throw linkError;
    }

    console.log("🔍 DIAGNOSTIC - Fin deleteAmbassadorClient - Succès");
    return true;
  } catch (error) {
    console.error("🔍 DIAGNOSTIC - Erreur fatale dans deleteAmbassadorClient:", {
      errorMessage: error instanceof Error ? error.message : 'Erreur inconnue',
      clientId
    });
    throw error;
  }
};
