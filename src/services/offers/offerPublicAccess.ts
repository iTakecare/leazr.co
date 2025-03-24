
import { supabase, adminSupabase } from "@/integrations/supabase/client";

/**
 * Récupère une offre pour affichage public (signature).
 * Utilise plusieurs stratégies pour garantir l'accès à l'offre.
 */
export const getPublicOfferById = async (offerId: string) => {
  if (!offerId) return null;
  
  try {
    console.log("Récupération publique de l'offre:", offerId);
    
    // Stratégie 1: Via la fonction RPC qui ignore les restrictions RLS
    let { data, error } = await supabase.rpc(
      'get_offer_by_id_public',
      { offer_id: offerId }
    );
    
    if (!error && data) {
      console.log("Offre récupérée via RPC:", data.id);
      return data;
    }
    
    console.log("Échec RPC, tentative directe:", error?.message);
    
    // Stratégie 2: Directe via le client standard
    const { data: directData, error: directError } = await supabase
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .maybeSingle();
    
    if (!directError && directData) {
      console.log("Offre récupérée via client standard:", directData.id);
      return directData;
    }
    
    console.log("Échec client standard, tentative admin:", directError?.message);
    
    // Stratégie 3: Via le client admin (dernier recours)
    const { data: adminData, error: adminError } = await adminSupabase
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .maybeSingle();
    
    if (adminError) {
      console.error("Échec de toutes les tentatives:", adminError);
      return null;
    }
    
    if (adminData) {
      console.log("Offre récupérée via client admin:", adminData.id);
      return adminData;
    }
    
    console.log("Aucune offre trouvée avec l'ID:", offerId);
    return null;
  } catch (error) {
    console.error("Exception lors de la récupération publique:", error);
    return null;
  }
};

// This function is no longer exported from this file to avoid duplicate exports
// It's kept here for internal use only
const _isOfferSigned = async (offerId: string): Promise<boolean> => {
  try {
    const offer = await getPublicOfferById(offerId);
    if (!offer) return false;
    
    // Une offre est considérée comme signée si elle a des données de signature
    // ou si son workflow_status est 'approved'
    return !!offer.signature_data || offer.workflow_status === 'approved';
  } catch (error) {
    console.error("Erreur lors de la vérification de signature:", error);
    return false;
  }
};
