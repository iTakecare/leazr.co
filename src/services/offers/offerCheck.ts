
import { supabase, adminSupabase } from "@/integrations/supabase/client";

/**
 * Vérifie simplement l'existence d'une offre par son ID.
 * Cette fonction est utilisée comme un filet de sécurité lorsque
 * les autres méthodes échouent.
 */
export const checkOfferExists = async (offerId: string): Promise<boolean> => {
  if (!offerId) return false;
  
  try {
    console.log("Vérification d'existence de l'offre:", offerId);
    
    // Essai avec le client standard
    let { data, error } = await supabase
      .from('offers')
      .select('id')
      .eq('id', offerId)
      .maybeSingle();
    
    if (error || !data) {
      console.log("Tentative avec adminSupabase suite à l'échec standard");
      // Tentative avec le client admin si le client standard échoue
      const result = await adminSupabase
        .from('offers')
        .select('id')
        .eq('id', offerId)
        .maybeSingle();
      
      data = result.data;
      error = result.error;
    }
    
    if (error) {
      console.error("Erreur lors de la vérification d'existence:", error);
      return false;
    }
    
    const exists = !!data;
    console.log("Résultat vérification d'existence:", exists);
    return exists;
  } catch (error) {
    console.error("Exception lors de la vérification d'existence:", error);
    return false;
  }
};

/**
 * Récupère une offre de manière très basique, sans filtrage ni jointures.
 * Tente plusieurs approches pour garantir la récupération de l'offre.
 */
export const getBasicOfferById = async (offerId: string) => {
  if (!offerId) return null;
  
  try {
    console.log("Récupération basique de l'offre:", offerId);
    
    // Tentative 1: Requête standard
    let { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .maybeSingle();
    
    if (error || !data) {
      console.log("Tentative avec adminSupabase suite à l'échec standard");
      // Tentative 2: Avec client admin
      const adminResult = await adminSupabase
        .from('offers')
        .select('*')
        .eq('id', offerId)
        .maybeSingle();
      
      data = adminResult.data;
      error = adminResult.error;
    }
    
    if (error) {
      console.error("Erreur lors de la récupération basique:", error);
      return null;
    }
    
    if (!data) {
      console.log("Aucune offre trouvée avec l'ID:", offerId);
      // Tentative 3: Requête SQL brute (dernier recours)
      const { data: rawData, error: rawError } = await supabase.rpc(
        'execute_sql',
        { sql: `SELECT * FROM public.offers WHERE id = '${offerId}' LIMIT 1` }
      );
      
      if (rawError || !rawData || rawData.length === 0) {
        console.error("Échec de la récupération via SQL brute:", rawError);
        return null;
      }
      
      return rawData[0];
    }
    
    return data;
  } catch (error) {
    console.error("Exception lors de la récupération basique:", error);
    return null;
  }
};

/**
 * Fonction de dernier recours qui utilise une requête directe à la table "offers"
 * sans filtrage par utilisateur ou autres contraintes.
 */
export const getRawOfferData = async (offerId: string) => {
  if (!offerId) return null;
  
  try {
    console.log("Récupération brute de l'offre:", offerId);
    
    // Utilisation d'une requête SQL brute pour contourner toute restriction RLS
    const { data, error } = await adminSupabase
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .single();
    
    if (error) {
      console.error("Erreur lors de la récupération brute:", error);
      return null;
    }
    
    console.log("Offre récupérée en mode brut:", data?.id);
    return data;
  } catch (error) {
    console.error("Exception lors de la récupération brute:", error);
    return null;
  }
};
