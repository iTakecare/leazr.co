
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
    
    // Tentative directe via le client admin pour garantir l'accès
    const adminResult = await adminSupabase
      .from('offers')
      .select('id')
      .eq('id', offerId)
      .maybeSingle();
      
    if (adminResult.data) {
      console.log("Offre existe (via admin):", offerId);
      return true;
    }
    
    if (adminResult.error) {
      console.error("Erreur admin lors de la vérification d'existence:", adminResult.error);
      
      // Deuxième tentative: RPC
      let { data, error } = await supabase.rpc(
        'get_offer_by_id_public',
        { offer_id: offerId }
      );
      
      if (!error && data) {
        console.log("Offre existe (via RPC):", offerId);
        return true;
      }
      
      // Troisième tentative: client standard
      const result = await supabase
        .from('offers')
        .select('id')
        .eq('id', offerId)
        .maybeSingle();
        
      if (result.data) {
        console.log("Offre existe (via standard):", offerId);
        return true;
      }
    }
    
    console.log("Aucune offre trouvée avec l'ID:", offerId);
    return false;
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
    
    // 1. Récupération directe via le client admin (la méthode la plus fiable)
    const { data: adminData, error: adminError } = await adminSupabase
      .from('offers')
      .select('*, clients(*)')
      .eq('id', offerId)
      .maybeSingle();
    
    if (!adminError && adminData) {
      console.log("Offre récupérée avec succès via admin:", adminData.id);
      console.log("Détails: client_name:", adminData.client_name, "monthly_payment:", adminData.monthly_payment);
      return adminData;
    }
    
    if (adminError) {
      console.error("Erreur admin:", adminError);
    }
    
    // 2. Tentative avec la fonction RPC spéciale
    const { data, error } = await supabase.rpc(
      'get_offer_by_id_public',
      { offer_id: offerId }
    );
    
    if (!error && data) {
      console.log("Offre récupérée avec succès via RPC:", data.id);
      return data;
    }
    
    // 3. Tentative directe avec le client standard
    const result = await supabase
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .maybeSingle();
    
    if (!result.error && result.data) {
      console.log("Offre récupérée avec succès via client standard:", result.data.id);
      return result.data;
    }
    
    console.log("Aucune offre trouvée avec l'ID:", offerId);
    return null;
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
    
    // Requête complète incluant les données client
    const { data, error } = await adminSupabase
      .from('offers')
      .select('*, clients(*)')
      .eq('id', offerId)
      .single();
    
    if (error) {
      console.error("Erreur lors de la récupération brute:", error);
      
      // Tentative alternative sans jointure
      const { data: simpleData, error: simpleError } = await adminSupabase
        .from('offers')
        .select('*')
        .eq('id', offerId)
        .single();
        
      if (simpleError) {
        console.error("Échec de la récupération simple:", simpleError);
        return null;
      }
      
      return simpleData;
    }
    
    console.log("Offre récupérée en mode brut:", data?.id);
    console.log("Détails: client_name:", data?.client_name, "monthly_payment:", data?.monthly_payment);
    return data;
  } catch (error) {
    console.error("Exception lors de la récupération brute:", error);
    return null;
  }
};
