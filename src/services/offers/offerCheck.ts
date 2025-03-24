
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
    
    // 1. Essai avec le client standard
    let { data, error } = await supabase
      .from('offers')
      .select('id')
      .eq('id', offerId)
      .maybeSingle();
    
    if (error || !data) {
      console.log("Tentative directe (sans RLS) via rpc");
      
      // 2. Tentative avec RPC pour contourner RLS
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_offer_by_id_public',
        { offer_id: offerId }
      );
      
      if (rpcError || !rpcData) {
        console.log("Tentative avec adminSupabase");
        
        // 3. Tentative avec le client admin
        const result = await adminSupabase
          .from('offers')
          .select('id')
          .eq('id', offerId)
          .maybeSingle();
        
        data = result.data;
        error = result.error;
      } else {
        data = rpcData;
      }
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
      // 4. Dernier recours: SQL brut via la fonction execute_sql
      try {
        console.log("Tentative avec SQL brut");
        const { data: rawData, error: rawError } = await adminSupabase.rpc(
          'execute_sql',
          { sql: `SELECT * FROM public.offers WHERE id = '${offerId}' LIMIT 1` }
        );
        
        if (rawError || !rawData || rawData.length === 0) {
          console.error("Échec de la récupération via SQL brute:", rawError);
          return null;
        }
        
        console.log("Offre récupérée via SQL brut:", rawData[0].id);
        return rawData[0];
      } catch (sqlError) {
        console.error("Erreur SQL brute:", sqlError);
        return null;
      }
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
      
      // Tentative avec SQL brut en dernier recours
      try {
        const { data: sqlData, error: sqlError } = await adminSupabase.rpc(
          'execute_sql',
          { sql: `SELECT * FROM offers WHERE id = '${offerId}'` }
        );
        
        if (sqlError || !sqlData || sqlData.length === 0) {
          console.error("Échec SQL brut:", sqlError);
          return null;
        }
        
        return sqlData[0];
      } catch (e) {
        console.error("Exception SQL brut:", e);
        return null;
      }
    }
    
    console.log("Offre récupérée en mode brut:", data?.id);
    return data;
  } catch (error) {
    console.error("Exception lors de la récupération brute:", error);
    return null;
  }
};
