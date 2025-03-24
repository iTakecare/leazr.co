
// Ce fichier doit exister déjà dans votre projet
// Je vais ajouter ou modifier la fonction getOfferById pour améliorer la validation d'ID
import { supabase } from "@/integrations/supabase/client";

export const getOfferById = async (offerId: string) => {
  try {
    console.log("Récupération de l'offre par ID:", offerId);
    
    // Vérification de la validité de l'UUID
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(offerId)) {
      console.error("Format d'ID d'offre invalide:", offerId);
      throw new Error(`Format d'ID invalide: ${offerId}`);
    }
    
    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        clients (
          id,
          name,
          email,
          company
        )
      `)
      .eq('id', offerId)
      .maybeSingle();
      
    if (error) {
      console.error("Erreur lors de la récupération de l'offre:", error);
      throw error;
    }
    
    if (!data) {
      console.error("Aucune offre trouvée avec l'ID:", offerId);
      throw new Error(`Offre introuvable: ${offerId}`);
    }
    
    return data;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'offre:", error);
    throw error;
  }
};

/**
 * Met à jour une offre existante
 * @param offerId ID de l'offre à mettre à jour
 * @param offerData Données de l'offre
 * @returns Succès de l'opération
 */
export const updateOffer = async (offerId: string, offerData: any) => {
  try {
    console.log("Mise à jour de l'offre:", offerId);
    console.log("Données de mise à jour:", offerData);
    
    // Vérification de la validité de l'UUID
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(offerId)) {
      console.error("Format d'ID d'offre invalide:", offerId);
      throw new Error(`Format d'ID invalide: ${offerId}`);
    }
    
    // Si le statut de workflow est fourni, mettre à jour également previous_status
    let updateData = { ...offerData };
    if (offerData.workflow_status) {
      // Obtenir le statut actuel pour le sauvegarder comme previous_status
      const { data: currentOffer } = await supabase
        .from('offers')
        .select('workflow_status')
        .eq('id', offerId)
        .maybeSingle();
      
      if (currentOffer && currentOffer.workflow_status !== offerData.workflow_status) {
        updateData.previous_status = currentOffer.workflow_status;
      }
    }
    
    // Mise à jour de l'offre
    const { data, error } = await supabase
      .from('offers')
      .update(updateData)
      .eq('id', offerId)
      .select()
      .maybeSingle();
      
    if (error) {
      console.error("Erreur lors de la mise à jour de l'offre:", error);
      throw error;
    }
    
    console.log("Offre mise à jour avec succès:", offerId);
    return data;
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'offre:", error);
    throw error;
  }
};
