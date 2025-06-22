
import { supabase } from "@/integrations/supabase/client";

export const createOfferMinimal = async (offerData: any) => {
  try {
    console.log("=== CRÉATION OFFRE MINIMALE POUR DEBUG ===");
    console.log("Données d'entrée:", offerData);
    
    // Test avec seulement les champs absolument nécessaires
    const minimalData = {
      client_name: offerData.client_name || "Test Client",
      client_email: offerData.client_email || "test@test.com",
      equipment_description: offerData.equipment_description || "Test Equipment",
      amount: 1000,
      coefficient: 3.27,
      monthly_payment: 305,
      company_id: offerData.company_id,
      user_id: offerData.user_id,
      type: "internal_offer",
      workflow_status: "draft",
      status: "pending"
    };

    console.log("Données minimales à insérer:", minimalData);

    // Insertion la plus simple possible
    const { data, error } = await supabase
      .from('offers')
      .insert(minimalData)
      .select();

    console.log("Résultat insertion:", { data, error });

    return { data, error };
  } catch (error) {
    console.error("Erreur dans createOfferMinimal:", error);
    return { data: null, error };
  }
};
