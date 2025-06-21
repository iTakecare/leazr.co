
import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/types/client";

// Obtenir les clients d'un ambassadeur avec diagnostic approfondi
export const getAmbassadorClients = async (): Promise<Client[]> => {
  try {
    console.log("🔍 DIAGNOSTIC - Début getAmbassadorClients");
    
    // Vérifier l'utilisateur authentifié
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log("🔍 DIAGNOSTIC - Utilisateur authentifié:", {
      userId: user?.id,
      email: user?.email,
      hasUser: !!user,
      userError: userError?.message,
      userMetadata: user?.user_metadata,
      rawUserMetadata: user?.raw_user_meta_data
    });
    
    if (!user) {
      console.error("🔍 DIAGNOSTIC - Aucun utilisateur authentifié");
      throw new Error("Utilisateur non authentifié");
    }
    
    // Vérifier la session avec plus de détails
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log("🔍 DIAGNOSTIC - Session:", {
      hasSession: !!session,
      sessionError: sessionError?.message,
      accessToken: session?.access_token ? "Present" : "Missing",
      tokenExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : "No expiry"
    });
    
    // D'abord vérifier si l'utilisateur a un profil ambassadeur avec diagnostic détaillé
    console.log("🔍 DIAGNOSTIC - Vérification du profil ambassadeur...");
    console.log("🔍 DIAGNOSTIC - Requête SQL équivalente: SELECT id, name, email, user_id FROM ambassadors WHERE user_id = '", user.id, "'");
    
    const { data: ambassadorProfile, error: ambassadorError } = await supabase
      .from('ambassadors')
      .select('id, name, email, user_id, company_id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    console.log("🔍 DIAGNOSTIC - Profil ambassadeur:", {
      ambassadorFound: !!ambassadorProfile,
      ambassadorId: ambassadorProfile?.id,
      ambassadorName: ambassadorProfile?.name,
      ambassadorEmail: ambassadorProfile?.email,
      ambassadorUserId: ambassadorProfile?.user_id,
      ambassadorCompanyId: ambassadorProfile?.company_id,
      ambassadorError: ambassadorError?.message,
      ambassadorErrorCode: ambassadorError?.code,
      ambassadorErrorDetails: ambassadorError?.details
    });
    
    if (ambassadorError) {
      console.error("🔍 DIAGNOSTIC - Erreur lors de la récupération du profil ambassadeur:", ambassadorError);
      throw new Error(`Erreur profil ambassadeur: ${ambassadorError.message}`);
    }
    
    if (!ambassadorProfile) {
      console.error("🔍 DIAGNOSTIC - Aucun profil ambassadeur trouvé pour cet utilisateur");
      throw new Error("Profil ambassadeur non trouvé");
    }
    
    console.log("🔍 DIAGNOSTIC - Récupération des liens ambassador_clients...");
    console.log("🔍 DIAGNOSTIC - Requête SQL équivalente: SELECT client_id, created_at, ambassador_id FROM ambassador_clients WHERE ambassador_id = '", ambassadorProfile.id, "'");
    
    // Test simple pour vérifier les permissions sur ambassador_clients
    console.log("🔍 DIAGNOSTIC - Test permissions sur ambassador_clients...");
    const { data: testData, error: testError } = await supabase
      .from('ambassador_clients')
      .select('id')
      .limit(1);
    
    console.log("🔍 DIAGNOSTIC - Test permissions:", {
      testSuccess: !testError,
      testError: testError?.message,
      testErrorCode: testError?.code,
      testErrorDetails: testError?.details,
      testDataCount: testData?.length || 0
    });
    
    if (testError) {
      console.error("🔍 DIAGNOSTIC - Erreur de permissions de base sur ambassador_clients:", testError);
    }
    
    // Récupérer les liens ambassador_clients avec RLS
    const { data: ambassadorClientsData, error: ambassadorClientsError } = await supabase
      .from('ambassador_clients')
      .select(`
        client_id,
        created_at,
        ambassador_id
      `)
      .eq('ambassador_id', ambassadorProfile.id);
    
    console.log("🔍 DIAGNOSTIC - Liens ambassador_clients:", {
      linksFound: ambassadorClientsData?.length || 0,
      linksData: ambassadorClientsData,
      linksError: ambassadorClientsError?.message,
      linksErrorCode: ambassadorClientsError?.code,
      linksErrorDetails: ambassadorClientsError?.details
    });
    
    if (ambassadorClientsError) {
      console.error("🔍 DIAGNOSTIC - Erreur lors de la récupération des liens:", ambassadorClientsError);
      
      // Diagnostic spécial pour l'erreur "permission denied for table users"
      if (ambassadorClientsError.message?.includes('permission denied for table users')) {
        console.error("🔍 DIAGNOSTIC - PROBLÈME CRITIQUE: La requête essaie d'accéder à auth.users");
        console.error("🔍 DIAGNOSTIC - Cela suggère un problème dans les politiques RLS");
        console.error("🔍 DIAGNOSTIC - Les politiques RLS ne devraient pas référencer auth.users directement");
      }
      
      throw new Error(`Erreur liens clients: ${ambassadorClientsError.message}`);
    }
    
    if (!ambassadorClientsData || ambassadorClientsData.length === 0) {
      console.log("🔍 DIAGNOSTIC - Aucun lien client trouvé pour cet ambassadeur");
      return [];
    }
    
    // Extraire les IDs des clients
    const clientIds = ambassadorClientsData.map(item => item.client_id);
    console.log("🔍 DIAGNOSTIC - IDs des clients à récupérer:", clientIds);
    
    // Test permissions sur la table clients
    console.log("🔍 DIAGNOSTIC - Test permissions sur clients...");
    const { data: clientTestData, error: clientTestError } = await supabase
      .from('clients')
      .select('id')
      .limit(1);
    
    console.log("🔍 DIAGNOSTIC - Test permissions clients:", {
      testSuccess: !clientTestError,
      testError: clientTestError?.message,
      testErrorCode: clientTestError?.code,
      testDataCount: clientTestData?.length || 0
    });
    
    // Récupérer les détails des clients en utilisant les IDs
    console.log("🔍 DIAGNOSTIC - Récupération des détails des clients...");
    console.log("🔍 DIAGNOSTIC - Requête SQL équivalente: SELECT * FROM clients WHERE id IN (", clientIds.join(', '), ")");
    
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        email,
        company,
        phone,
        address,
        city,
        postal_code,
        country,
        vat_number,
        notes,
        status,
        created_at,
        updated_at,
        user_id,
        has_user_account,
        company_id
      `)
      .in('id', clientIds);
    
    console.log("🔍 DIAGNOSTIC - Détails des clients:", {
      clientsFound: clientsData?.length || 0,
      clientsData: clientsData,
      clientsError: clientsError?.message,
      clientsErrorCode: clientsError?.code,
      clientsErrorDetails: clientsError?.details
    });
    
    if (clientsError) {
      console.error("🔍 DIAGNOSTIC - Erreur lors de la récupération des détails clients:", clientsError);
      throw new Error(`Erreur détails clients: ${clientsError.message}`);
    }
    
    // Marquer les clients comme clients d'ambassadeur
    const processedClients = clientsData?.map(client => ({
      ...client,
      is_ambassador_client: true
    })) || [];
    
    console.log("🔍 DIAGNOSTIC - Clients traités:", {
      totalProcessed: processedClients.length,
      clients: processedClients.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        status: c.status
      }))
    });
    
    console.log("🔍 DIAGNOSTIC - Fin getAmbassadorClients - Succès");
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
