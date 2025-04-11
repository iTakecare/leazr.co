
import { supabase } from "@/integrations/supabase/client";
import { OfferData } from "./types";

/**
 * Récupère toutes les offres de la base de données
 * @param includeConverted Inclure les offres converties en contrats
 * @returns Un objet contenant les données ou une erreur
 */
export const getOffers = async (includeConverted = false) => {
  try {
    console.log(`Récupération des offres (includeConverted: ${includeConverted})`);
    
    let query = supabase
      .from("offers")
      .select(`
        *,
        clients:client_id (
          id, 
          name,
          email, 
          company
        )
      `)
      .order("created_at", { ascending: false });
    
    // Filtrer les offres converties si nécessaire
    if (!includeConverted) {
      query = query.eq("converted_to_contract", false);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Erreur lors de la récupération des offres:", error);
      return { data: null, error };
    }
    
    console.log(`${data.length} offres récupérées`);
    return { data, error: null };
  } catch (error) {
    console.error("Exception lors de la récupération des offres:", error);
    return { data: null, error };
  }
};

/**
 * Récupère les offres d'un client spécifique
 * @param clientId Identifiant du client
 * @returns Les offres du client
 */
export const getOffersByClientId = async (clientId: string) => {
  try {
    console.log(`Récupération des offres pour le client: ${clientId}`);
    
    const { data, error } = await supabase
      .from("offers")
      .select(`
        *,
        clients:client_id (
          id, 
          name,
          email, 
          company
        )
      `)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Erreur lors de la récupération des offres:", error);
      return { data: null, error };
    }
    
    console.log(`${data.length} offres récupérées pour le client ${clientId}`);
    return { data, error: null };
  } catch (error) {
    console.error("Exception lors de la récupération des offres:", error);
    return { data: null, error };
  }
};

/**
 * Récupère une offre par son ID
 * @param offerId Identifiant de l'offre
 * @returns L'offre correspondante ou null
 */
export const getOfferById = async (offerId: string) => {
  try {
    console.log(`Récupération de l'offre: ${offerId}`);
    
    const { data, error } = await supabase
      .from("offers")
      .select(`
        *,
        clients:client_id (
          id, 
          name,
          email, 
          company
        )
      `)
      .eq("id", offerId)
      .single();
    
    if (error) {
      console.error("Erreur lors de la récupération de l'offre:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Exception lors de la récupération de l'offre:", error);
    return null;
  }
};
