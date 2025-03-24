
import { supabase } from "@/integrations/supabase/client";

/**
 * Vérifie simplement l'existence d'une offre par son ID.
 * Cette fonction est utilisée comme un filet de sécurité lorsque
 * les autres méthodes échouent.
 */
export const checkOfferExists = async (offerId: string): Promise<boolean> => {
  if (!offerId) return false;
  
  try {
    console.log("Vérification simple de l'existence de l'offre:", offerId);
    
    const { data, error } = await supabase
      .from('offers')
      .select('id')
      .eq('id', offerId)
      .maybeSingle();
    
    if (error) {
      console.error("Erreur lors de la vérification d'existence:", error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error("Exception lors de la vérification d'existence:", error);
    return false;
  }
};

/**
 * Récupère une offre de manière très basique, sans filtrage ni jointures.
 * À utiliser en dernier recours.
 */
export const getBasicOfferById = async (offerId: string) => {
  if (!offerId) return null;
  
  try {
    console.log("Récupération basique de l'offre:", offerId);
    
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .maybeSingle();
    
    if (error) {
      console.error("Erreur lors de la récupération basique:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Exception lors de la récupération basique:", error);
    return null;
  }
};
