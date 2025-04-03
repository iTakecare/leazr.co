
import { supabase } from "@/integrations/supabase/client";
import { OfferData } from "./types";
import { calculateCommissionByLevel } from "@/utils/calculator";

export const createOffer = async (offerData: OfferData) => {
  try {
    console.log("Creating offer with data:", offerData);

    // Ensure numeric values are properly converted
    const offerDataToSave = {
      ...offerData,
      amount: typeof offerData.amount === 'string' ? parseFloat(offerData.amount) : offerData.amount,
      coefficient: typeof offerData.coefficient === 'string' ? parseFloat(offerData.coefficient) : offerData.coefficient,
      monthly_payment: typeof offerData.monthly_payment === 'string' ? parseFloat(offerData.monthly_payment) : offerData.monthly_payment,
      commission: offerData.commission ? 
        (typeof offerData.commission === 'string' ? parseFloat(offerData.commission) : offerData.commission) : 
        undefined
    };

    // Si la commission est déjà fournie, utiliser cette valeur directement
    if (offerDataToSave.commission !== undefined && offerDataToSave.commission !== null) {
      console.log("Using provided commission value:", offerDataToSave.commission);
    }

    // Ajout de ambassador_id à l'offre si c'est une offre d'ambassadeur
    if (offerData.type === 'ambassador_offer' && offerData.user_id) {
      // Récupérer l'ambassador_id associé à cet utilisateur
      const { data: ambassadorData, error: ambassadorError } = await supabase
        .from('ambassadors')
        .select('id, commission_level_id')
        .eq('user_id', offerData.user_id)
        .single();
        
      if (!ambassadorError && ambassadorData) {
        offerDataToSave.ambassador_id = ambassadorData.id;
        
        // Calculer la commission seulement si elle n'est pas déjà fournie
        if (offerDataToSave.amount && ambassadorData.commission_level_id && 
            (offerDataToSave.commission === undefined || offerDataToSave.commission === null)) {
          try {
            // Ensure amount is a number for calculation
            const amount = typeof offerDataToSave.amount === 'string' 
              ? parseFloat(offerDataToSave.amount) 
              : offerDataToSave.amount;
              
            const commissionData = await calculateCommissionByLevel(
              Number(amount),
              ambassadorData.commission_level_id,
              'ambassador',
              ambassadorData.id
            );
            
            if (commissionData && commissionData.amount) {
              offerDataToSave.commission = commissionData.amount;
              console.log("Calculated commission instead:", commissionData.amount);
            }
          } catch (commError) {
            console.error("Error calculating commission during offer creation:", commError);
          }
        }
      }
    }
    
    console.log("Final offer data to save:", offerDataToSave);
    
    const { data, error } = await supabase
      .from('offers')
      .insert(offerDataToSave)
      .select()
      .single();
    
    return { data, error };
  } catch (error) {
    console.error("Error in createOffer:", error);
    return { data: null, error };
  }
};
