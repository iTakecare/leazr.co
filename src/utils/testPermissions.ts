
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

/**
 * Teste si les autorisations pour la création de clients sont correctement configurées
 */
export const testClientCreationPermission = async (): Promise<boolean> => {
  try {
    console.log("Test de création d'un client...");
    const testId = uuidv4();
    const testEmail = `test-${testId.substring(0, 8)}@test.com`;
    
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
    
    const { data, error } = await supabase
      .from('clients')
      .insert(testClientData)
      .select()
      .single();
    
    if (error) {
      console.error("Erreur lors du test de création client:", error);
      toast.error(`Erreur de permissions: ${error.message}`);
      return false;
    }
    
    console.log("Test de création client réussi:", data);
    toast.success("Test de création client réussi");
    
    // Nettoyage: supprimer le client de test
    await supabase
      .from('clients')
      .delete()
      .eq('id', testId);
    
    return true;
  } catch (error) {
    console.error("Exception lors du test de création client:", error);
    toast.error(`Exception: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    return false;
  }
};

/**
 * Teste si les autorisations pour la création d'offres sont correctement configurées
 */
export const testOfferCreationPermission = async (): Promise<boolean> => {
  try {
    console.log("Test de création d'une offre...");
    const testId = uuidv4();
    const testClientId = uuidv4();
    
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
    
    const { data, error } = await supabase
      .from('offers')
      .insert(testOfferData)
      .select()
      .single();
    
    if (error) {
      console.error("Erreur lors du test de création d'offre:", error);
      toast.error(`Erreur de permissions: ${error.message}`);
      return false;
    }
    
    console.log("Test de création d'offre réussi:", data);
    toast.success("Test de création d'offre réussi");
    
    // Nettoyage: supprimer l'offre de test
    await supabase
      .from('offers')
      .delete()
      .eq('id', testId);
    
    return true;
  } catch (error) {
    console.error("Exception lors du test de création d'offre:", error);
    toast.error(`Exception: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    return false;
  }
};

/**
 * Exécute tous les tests de permissions
 */
export const runAllPermissionsTests = async (): Promise<void> => {
  toast.info("Début des tests de permissions...");
  
  const clientResult = await testClientCreationPermission();
  const offerResult = await testOfferCreationPermission();
  
  if (clientResult && offerResult) {
    toast.success("Tous les tests de permissions sont réussis");
  } else {
    toast.error("Certains tests de permissions ont échoué");
  }
};
