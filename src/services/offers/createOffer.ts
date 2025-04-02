
import { supabase } from "@/integrations/supabase/client";
import { OfferData } from "./types";
import { calculateCommissionByLevel } from "@/utils/calculator";

export const createOffer = async (offerData: OfferData) => {
  try {
    // Ajout de ambassador_id à l'offre si c'est une offre d'ambassadeur
    if (offerData.type === 'ambassador_offer' && offerData.user_id) {
      // Récupérer l'ambassador_id associé à cet utilisateur
      const { data: ambassadorData, error: ambassadorError } = await supabase
        .from('ambassadors')
        .select('id, commission_level_id')
        .eq('user_id', offerData.user_id)
        .single();
        
      if (!ambassadorError && ambassadorData) {
        offerData.ambassador_id = ambassadorData.id;
        
        // Si nous avons un montant et un niveau de commission, recalculons la commission
        if (offerData.amount && ambassadorData.commission_level_id) {
          try {
            const commissionData = await calculateCommissionByLevel(
              offerData.amount,
              ambassadorData.commission_level_id,
              'ambassador',
              ambassadorData.id
            );
            
            if (commissionData && commissionData.amount) {
              offerData.commission = commissionData.amount;
            }
          } catch (commError) {
            console.error("Error calculating commission during offer creation:", commError);
          }
        }
      }
    }
    
    const { data, error } = await supabase
      .from('offers')
      .insert(offerData)
      .select()
      .single();
    
    return { data, error };
  } catch (error) {
    console.error("Error in createOffer:", error);
    return { data: null, error };
  }
};
