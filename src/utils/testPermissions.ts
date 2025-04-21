
import { supabase, getAdminSupabaseClient } from "@/integrations/supabase/client";
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
    
    console.log("En train de créer un client test avec le client administrateur...");
    
    // Essai de création d'un client test
    const { data, error } = await adminClient
      .from('clients')
      .insert(testClientData)
      .select()
      .single();
    
    if (error) {
      console.error("Erreur lors du test de création client:", error);
      toast.error(`Erreur lors du test: ${error.message}`);
      return { success: false, message: error.message };
    }
    
    console.log("Test de création client réussi:", data);
    toast.success("Test de création client réussi");
    
    // Ne pas supprimer le client de test pour l'utiliser dans le test d'offre
    return { success: true, clientId: testId };
  } catch (error) {
    console.error("Exception lors du test de création client:", error);
    toast.error(`Exception: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    return { success: false, message: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
};

/**
 * Teste spécifiquement la configuration du client admin
 */
export const testAdminClientConfiguration = async (): Promise<{success: boolean; message: string}> => {
  try {
    console.log("Test de la configuration du client admin...");
    
    // Récupération du client admin
    const adminClient = getAdminSupabaseClient();
    
    // Analyse de la configuration du client
    console.log("Client admin créé avec succès");
    
    // Tentative d'appel à un endpoint simple
    const { data: testData, error: testError } = await adminClient
      .from('clients')
      .select('count(*)')
      .limit(1);
    
    if (testError) {
      console.error("Échec du test simple avec le client admin:", testError);
      return { 
        success: false, 
        message: `Le client admin ne peut pas effectuer d'opérations simples: ${testError.message}`
      };
    }
    
    console.log("Test simple avec le client admin réussi:", testData);
    
    // Test réussi
    return { 
      success: true, 
      message: "La configuration du client admin semble correcte et peut effectuer des opérations"
    };
  } catch (error) {
    console.error("Exception lors du test de configuration du client admin:", error);
    return { 
      success: false, 
      message: `Exception lors du test: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    };
  }
};
