
import { supabase, getAdminSupabaseClient, SERVICE_ROLE_KEY, SUPABASE_URL } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

/**
 * Teste si les autorisations pour la création de clients sont correctement configurées
 */
export const testClientCreationPermission = async (): Promise<{success: boolean; message?: string; clientId?: string}> => {
  try {
    console.log("Test de création d'un client...");
    const testId = uuidv4();
    const testEmail = `test-${testId.substring(0, 8)}@test.com`;
    
    // Vérifier que la clé de service est définie
    if (!SERVICE_ROLE_KEY) {
      return { 
        success: false, 
        message: "SERVICE_ROLE_KEY n'est pas définie ou est vide" 
      };
    }
    
    console.log("[TEST] Creating fresh admin client for test...");
    // Obtenir une nouvelle instance de client admin
    const adminClient = getAdminSupabaseClient();
    
    // Test direct creation using admin client
    const testClientData = {
      id: testId,
      name: "Client Test",
      email: testEmail,
      company: "Entreprise Test",
      phone: "+32000000000",
      address: "Rue de Test 123",
      city: "Test Ville",
      postal_code: "1000",
      country: "BE",
      vat_number: "BE0123456789",
      status: "active" as const
    };
    
    console.log("[TEST] Tentative d'insertion avec client admin...");
    
    try {
      // Log des informations pour le débogage
      console.log("[TEST] Test insertion avec client admin...");
      
      // Test explicite du client admin sans authentification utilisateur
      const { data, error } = await adminClient
        .from('clients')
        .insert(testClientData)
        .select()
        .single();
      
      if (error) {
        console.error("[TEST] Erreur lors du test de création client:", error);
        console.error("[TEST] Détails de l'erreur:", JSON.stringify(error, null, 2));
        return { 
          success: false, 
          message: `Erreur: ${error.message} (Code: ${error.code})` 
        };
      }
      
      console.log("[TEST] Test de création client réussi:", data);
      return { success: true, clientId: testId };
    } catch (insertError) {
      console.error("[TEST] Exception lors de l'insertion du client test:", insertError);
      return { 
        success: false, 
        message: insertError instanceof Error 
          ? `Exception: ${insertError.message}` 
          : 'Erreur inconnue lors de l\'insertion' 
      };
    }
  } catch (error) {
    console.error("[TEST] Exception globale lors du test de création client:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Erreur inconnue' 
    };
  }
};

/**
 * Teste spécifiquement la configuration du client admin
 */
export const testAdminClientConfiguration = async (): Promise<{success: boolean; message: string}> => {
  try {
    console.log("[TEST] Test de la configuration du client admin...");
    
    // Vérifier que la clé de service est définie et valide
    if (!SERVICE_ROLE_KEY) {
      return { 
        success: false, 
        message: "La clé de service (SERVICE_ROLE_KEY) est vide ou non définie" 
      };
    }
    
    if (SERVICE_ROLE_KEY.length < 30) {
      return {
        success: false,
        message: "La clé de service semble invalide (trop courte)"
      };
    }
    
    // Récupération du client admin
    const adminClient = getAdminSupabaseClient();
    
    // Test basique d'authentification avec la clé
    console.log("[TEST] Test de connexion au projet Supabase...");
    console.log("[TEST] Test de connexion avec client admin...");
    
    // Try to select something from a system table we know exists
    const { data: clientsData, error: clientsError } = await adminClient
      .from('clients')
      .select('id')
      .limit(1);
    
    if (clientsError) {
      return {
        success: false, 
        message: `Erreur de connexion au projet: ${clientsError.message}`
      };
    }
    
    // Test direct de sélection avec le client admin
    console.log("[TEST] Test de sélection avec le client admin...");
    try {
      // Essayer de sélectionner un client (n'importe lequel) pour tester les permissions
      const { data: selectData, error: selectError } = await adminClient
        .from('clients')
        .select('id')
        .limit(1);
      
      if (selectError) {
        console.error("[TEST] Échec du test de sélection avec le client admin:", selectError);
        return { 
          success: false, 
          message: `Le client admin ne peut pas effectuer une sélection simple: ${selectError.message}` 
        };
      }
      
      console.log("[TEST] Test de sélection réussi:", selectData);
      
      // Test réussi
      return { 
        success: true, 
        message: "La configuration du client admin est correcte et peut effectuer des opérations" 
      };
    } catch (testError) {
      console.error("[TEST] Exception lors du test avec le client admin:", testError);
      return { 
        success: false, 
        message: `Exception lors du test: ${testError instanceof Error ? testError.message : 'Erreur inconnue'}` 
      };
    }
  } catch (error) {
    console.error("[TEST] Exception lors du test de configuration du client admin:", error);
    return { 
      success: false, 
      message: `Exception lors du test: ${error instanceof Error ? error.message : 'Erreur inconnue'}` 
    };
  }
};

/**
 * Teste explicitement la récupération des offres
 */
export const testOffersRetrieval = async (): Promise<{success: boolean; message: string; data?: any}> => {
  try {
    console.log("[TEST] Test de récupération des offres...");
    
    // Récupération du client admin
    const adminClient = getAdminSupabaseClient();
    
    // Test de récupération des offres
    const { data, error } = await adminClient
      .from('offers')
      .select('id, client_name, created_at')
      .limit(5);
    
    if (error) {
      console.error("[TEST] Erreur lors de la récupération des offres:", error);
      return {
        success: false,
        message: `Erreur: ${error.message} (Code: ${error.code || 'inconnu'})`
      };
    }
    
    console.log("[TEST] Récupération des offres réussie, nombre d'offres:", data?.length || 0);
    return {
      success: true,
      message: `${data?.length || 0} offres récupérées avec succès`,
      data: data
    };
  } catch (error) {
    console.error("[TEST] Exception lors du test de récupération des offres:", error);
    return {
      success: false,
      message: `Exception: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    };
  }
};
