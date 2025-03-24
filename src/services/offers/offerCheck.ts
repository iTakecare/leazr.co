
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
    
    // 1. Première tentative: via la fonction RPC spéciale qui contourne RLS
    let { data, error } = await supabase.rpc(
      'get_offer_by_id_public',
      { offer_id: offerId }
    );
    
    if (error) {
      console.error("Erreur lors de l'appel RPC:", error);
      
      // 2. Deuxième tentative: directe via le client standard
      const result = await supabase
        .from('offers')
        .select('id')
        .eq('id', offerId)
        .maybeSingle();
      
      if (result.error || !result.data) {
        console.log("Tentative avec adminSupabase");
        
        // 3. Troisième tentative: avec le client admin
        const adminResult = await adminSupabase
          .from('offers')
          .select('id')
          .eq('id', offerId)
          .maybeSingle();
        
        data = adminResult.data;
        error = adminResult.error;
      } else {
        data = result.data;
        error = result.error;
      }
    }
    
    if (error) {
      console.error("Erreur finale lors de la vérification d'existence:", error);
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
 * Utilise la fonction RPC `get_offer_by_id_public` qui contourne les restrictions RLS.
 */
export const getBasicOfferById = async (offerId: string) => {
  if (!offerId) return null;
  
  try {
    console.log("Récupération basique de l'offre:", offerId);
    
    // 1. Tentative avec la fonction RPC spéciale
    let { data, error } = await supabase.rpc(
      'get_offer_by_id_public',
      { offer_id: offerId }
    );
    
    if (error || !data) {
      console.log("Échec de la fonction RPC, tentative directe");
      
      // 2. Tentative directe avec le client standard
      const result = await supabase
        .from('offers')
        .select('*')
        .eq('id', offerId)
        .maybeSingle();
      
      if (result.error || !result.data) {
        console.log("Échec du client standard, tentative avec client admin");
        
        // 3. Tentative avec le client admin (contourne RLS)
        const adminResult = await adminSupabase
          .from('offers')
          .select('*')
          .eq('id', offerId)
          .maybeSingle();
        
        data = adminResult.data;
        error = adminResult.error;
      } else {
        data = result.data;
        error = result.error;
      }
    }
    
    if (error) {
      console.error("Erreur lors de la récupération basique:", error);
      return null;
    }
    
    if (!data) {
      console.log("Aucune offre trouvée avec l'ID:", offerId);
      return null;
    }
    
    console.log("Offre récupérée avec succès:", data?.id);
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
    
    // Utilisation directe du client admin
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
