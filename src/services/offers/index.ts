
import { getOffers } from './getOffers';
import { supabase } from '@/integrations/supabase/client';
import { createOffer } from './createOffer';

export const getAllOffers = async (includeConverted = false) => {
  try {
    console.log("getAllOffers: récupération des offres");
    
    const { data, error } = await supabase
      .from('offers')
      .select('*, clients(id, name, email, company)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Erreur dans getAllOffers:", error);
      return { data: [], error };
    }
    
    console.log(`getAllOffers: ${data?.length || 0} offres récupérées`);
    
    // Filtrer les offres converties si nécessaire
    const filteredData = includeConverted 
      ? data 
      : data?.filter(offer => !offer.converted_to_contract);
    
    return { data: filteredData || [], error: null };
  } catch (error: any) {
    console.error("Exception dans getAllOffers:", error);
    return { data: [], error };
  }
};

export { getOffers, createOffer };
