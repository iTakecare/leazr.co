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
