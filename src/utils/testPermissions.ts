
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
    
    // Utiliser le client admin pour contourner les restrictions RLS
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
 * Teste si les autorisations pour la création d'offres sont correctement configurées
 * @param clientId ID optionnel d'un client existant à utiliser pour le test
 */
export const testOfferCreationPermission = async (clientId?: string | null): Promise<{success: boolean; message?: string}> => {
  try {
    console.log("Test de création d'une offre...");
    const testId = uuidv4();
    
    // Si aucun clientId n'est fourni, créer un client de test
    let testClientId = clientId;
    if (!testClientId) {
      const clientResult = await testClientCreationPermission();
      if (!clientResult.success) {
        return { success: false, message: `Impossible de créer un client de test: ${clientResult.message}` };
      }
      testClientId = clientResult.clientId;
    }
    
    if (!testClientId) {
      return { success: false, message: "Impossible d'obtenir un ID client valide pour le test" };
    }
    
    // Utiliser le client admin pour contourner les restrictions RLS
    const adminClient = getAdminSupabaseClient();
    
    const testOfferData = {
      id: testId,
      client_id: testClientId,
      client_name: "Client Test",
      client_email: "test@test.com",
      equipment_description: "Équipement de test",
      amount: 1000,
      coefficient: 1.0,
      monthly_payment: 50,
      commission: 0,
      type: "client_request",
      workflow_status: "requested",
      status: "pending",
      remarks: "Test de permissions",
      user_id: null
    };
    
    console.log("En train de créer une offre test avec le client administrateur...");
    const { data, error } = await adminClient
      .from('offers')
      .insert(testOfferData)
      .select()
      .single();
    
    if (error) {
      console.error("Erreur lors du test de création d'offre:", error);
      toast.error(`Erreur lors du test: ${error.message}`);
      return { success: false, message: error.message };
    }
    
    console.log("Test de création d'offre réussi:", data);
    toast.success("Test de création d'offre réussi");
    
    // Nettoyage: supprimer l'offre de test
    await adminClient
      .from('offers')
      .delete()
      .eq('id', testId);
      
    // Nettoyage: supprimer aussi le client de test si on l'a créé spécifiquement pour ce test
    if (!clientId && testClientId) {
      await adminClient
        .from('clients')
        .delete()
        .eq('id', testClientId);
    }
    
    return { success: true };
  } catch (error) {
    console.error("Exception lors du test de création d'offre:", error);
    toast.error(`Exception: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    return { success: false, message: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
};

/**
 * Exécute tous les tests de permissions
 */
export const runAllPermissionsTests = async (): Promise<{
  clientResult: {success: boolean; message: string},
  offerResult: {success: boolean; message: string}
}> => {
  toast.info("Début des tests de permissions...");
  
  const clientResult = await testClientCreationPermission();
  let clientTestResult = {
    success: clientResult.success,
    message: clientResult.success 
      ? "Test de création de client réussi!"
      : `Échec du test de création de client: ${clientResult.message || 'Erreur inconnue'}`
  };
  
  // Utiliser le client qu'on vient de créer pour le test d'offre
  const offerResult = await testOfferCreationPermission(clientResult.clientId);
  let offerTestResult = {
    success: offerResult.success,
    message: offerResult.success 
      ? "Test de création d'offre réussi!"
      : `Échec du test de création d'offre: ${offerResult.message || 'Erreur inconnue'}`
  };
  
  // Nettoyer le client de test si création d'offre réussie
  const adminClient = getAdminSupabaseClient();
  if (clientResult.success) {
    try {
      await adminClient
        .from('clients')
        .delete()
        .eq('id', clientResult.clientId);
    } catch (error) {
      console.error("Erreur lors du nettoyage du client test:", error);
    }
  }
  
  if (clientResult.success && offerResult.success) {
    toast.success("Tous les tests de permissions sont réussis");
  } else {
    toast.error("Certains tests de permissions ont échoué");
  }
  
  return {
    clientResult: clientTestResult,
    offerResult: offerTestResult
  };
};
