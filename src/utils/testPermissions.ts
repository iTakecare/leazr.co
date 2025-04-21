
import { supabase, getAdminSupabaseClient, SERVICE_ROLE_KEY } from "@/integrations/supabase/client";
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
    
    // Obtenir une nouvelle instance de client admin
    const adminClient = getAdminSupabaseClient();
    
    // Verify service role key is defined
    if (!SERVICE_ROLE_KEY) {
      return { 
        success: false, 
        message: "SERVICE_ROLE_KEY n'est pas définie" 
      };
    }
    
    console.log("[TEST] Vérification de la configuration du client admin...");
    
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
    
    console.log("[TEST] En train de créer un client test avec le client administrateur...");
    
    // Essai de création d'un client test avec logging détaillé
    try {
      const { data, error } = await adminClient
        .from('clients')
        .insert(testClientData)
        .select()
        .single();
      
      if (error) {
        console.error("[TEST] Erreur lors du test de création client:", error);
        toast.error(`Erreur lors du test: ${error.message}`);
        return { success: false, message: error.message };
      }
      
      console.log("[TEST] Test de création client réussi:", data);
      toast.success("Test de création client réussi");
      
      // Ne pas supprimer le client de test pour l'utiliser dans le test d'offre
      return { success: true, clientId: testId };
    } catch (insertError) {
      console.error("[TEST] Exception lors de l'insertion du client test:", insertError);
      return { 
        success: false, 
        message: insertError instanceof Error ? insertError.message : 'Erreur inconnue lors de l\'insertion' 
      };
    }
  } catch (error) {
    console.error("[TEST] Exception lors du test de création client:", error);
    toast.error(`Exception: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    return { success: false, message: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
};

/**
 * Teste spécifiquement la configuration du client admin
 */
export const testAdminClientConfiguration = async (): Promise<{success: boolean; message: string}> => {
  try {
    console.log("[TEST] Test de la configuration du client admin...");
    
    // Vérifier que la clé de service est définie
    if (!SERVICE_ROLE_KEY) {
      return { 
        success: false, 
        message: "La clé de service (SERVICE_ROLE_KEY) n'est pas définie" 
      };
    }
    
    // Récupération du client admin
    const adminClient = getAdminSupabaseClient();
    
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
      
      // Vérifier si des clients existent dans la base de données
      if (!selectData || selectData.length === 0) {
        console.log("[TEST] Aucun client trouvé dans la base de données");
        
        // Tester l'insertion d'un client temporaire pour vérifier les permissions
        const testId = uuidv4();
        const { error: insertError } = await adminClient
          .from('clients')
          .insert({
            id: testId,
            name: "Test Client For Admin",
            email: `admin-test-${testId.substring(0, 8)}@example.com`,
            status: "active"
          });
        
        if (insertError) {
          console.error("[TEST] Échec du test d'insertion avec le client admin:", insertError);
          return { 
            success: false, 
            message: `Le client admin ne peut pas insérer de données: ${insertError.message}` 
          };
        }
        
        // Supprimer le client temporaire
        await adminClient
          .from('clients')
          .delete()
          .eq('id', testId);
      }
      
      console.log("[TEST] Test avec le client admin réussi");
      
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
