
import { supabase } from "@/integrations/supabase/client";
import { OfferData } from "./types";
import { calculateFinancedAmount } from "@/utils/calculator";

// Fonction pour créer une offre
export const createOffer = async (offerData: any) => {
  try {
    console.log("Creating offer with data:", offerData);
    
    // Assurons-nous que les offres non-ambassador ont une commission à 0
    if (offerData.type !== 'ambassador_offer' && !offerData.ambassador_id) {
      offerData.commission = 0;
      console.log("Non-ambassador offer: setting commission to zero");
    } else {
      console.log("Ambassador offer with commission:", offerData.commission);
    }
    
    const { data, error } = await supabase
      .from('offers')
      .insert([offerData])
      .select()
      .single();

    if (error) {
      console.error("Error creating offer:", error);
      return { data: null, error };
    }

    console.log("Offer created successfully:", data);
    return { data, error: null };
  } catch (error) {
    console.error("Error in createOffer:", error);
    return { data: null, error: error as Error };
  }
};

export const getAllOffers = async (): Promise<{ data: OfferData[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*');

    if (error) {
      console.error("Erreur lors de la récupération des offres:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Erreur lors de la récupération des offres:", error);
    return { data: null, error };
  }
};
