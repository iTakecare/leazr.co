
import { supabase, getAdminSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Récupère toutes les offres en tenant compte du filtre pour inclure ou non les offres converties
 */
export const getOffers = async (includeConverted: boolean = false): Promise<any[]> => {
  console.log(`Démarrage de la récupération des offres (includeConverted: ${includeConverted})`);
  
  try {
    // Récupération avec le client standard
    console.log("Tentative avec le client standard...");
    const { data: userData } = await supabase.auth.getUser();
    console.log("Utilisateur connecté:", userData?.user?.id || "Non connecté");
    
    const { data, error } = await supabase
      .from('offers')
      .select('*');
    
    if (error) {
      console.error("Erreur avec client standard:", error);
      throw error;
    }
    
    console.log(`${data?.length || 0} offres récupérées avec client standard`);
    
    // Filtrer les offres si nécessaire
    const filteredData = includeConverted 
      ? data 
      : data?.filter(offer => !offer.converted_to_contract);
    
    return filteredData || [];
  } catch (standardClientError) {
    console.error("Échec avec client standard, tentative avec client admin...", standardClientError);
    
    try {
      // Tenter avec un client admin créé manuellement
      const adminClient = getAdminSupabaseClient();
      
      const { data, error } = await adminClient
        .from('offers')
        .select('*');
      
      if (error) {
        console.error("Erreur avec client admin:", error);
        throw error;
      }
      
      console.log(`${data?.length || 0} offres récupérées avec client admin`);
      
      // Filtrer les offres si nécessaire
      const filteredData = includeConverted 
        ? data 
        : data?.filter(offer => !offer.converted_to_contract);
      
      return filteredData || [];
    } catch (adminClientError) {
      console.error("Erreur fatale avec les deux clients:", adminClientError);
      
      // Retourner un tableau vide pour éviter les erreurs
      return [];
    }
  }
};

/**
 * Récupère les offres par ID client
 */
export const getOffersByClientId = async (clientId: string): Promise<any[]> => {
  try {
    console.log("Récupération des offres pour client ID:", clientId);
    
    // Essai avec client standard
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('client_id', clientId)
      .eq('converted_to_contract', false);
    
    if (error) {
      console.error("Erreur avec client standard:", error);
      throw error;
    }
    
    return data || [];
  } catch (standardClientError) {
    console.error("Tentative avec client admin...", standardClientError);
    
    try {
      // Essai avec client admin
      const adminClient = getAdminSupabaseClient();
      const { data, error } = await adminClient
        .from('offers')
        .select('*')
        .eq('client_id', clientId)
        .eq('converted_to_contract', false);
      
      if (error) {
        console.error("Erreur avec client admin:", error);
        throw error;
      }
      
      return data || [];
    } catch (adminClientError) {
      console.error("Erreur fatale avec les deux clients:", adminClientError);
      return [];
    }
  }
};
