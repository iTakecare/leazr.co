
import { supabase } from "@/integrations/supabase/client";
import { OfferData } from "./types";
import { calculateCommissionByLevel } from "@/utils/calculator";

export const createOffer = async (offerData: OfferData) => {
  try {
    // Ensure numeric values are properly converted
    const offerDataToSave = {
      ...offerData,
      amount: typeof offerData.amount === 'string' ? parseFloat(offerData.amount) : offerData.amount,
      coefficient: typeof offerData.coefficient === 'string' ? parseFloat(offerData.coefficient) : offerData.coefficient,
      monthly_payment: typeof offerData.monthly_payment === 'string' ? parseFloat(offerData.monthly_payment) : offerData.monthly_payment,
      commission: offerData.commission !== undefined ? 
        (typeof offerData.commission === 'string' ? parseFloat(offerData.commission) : offerData.commission) : 
        undefined
    };

    // Log the commission value for debugging
    console.log(`Commission value in createOffer.ts: ${offerDataToSave.commission}€`, typeof offerDataToSave.commission);

    // Si la commission est déjà définie et non nulle, nous utilisons cette valeur
    // Cela est prioritaire par rapport au calcul basé sur l'ambassadeur
    if (offerDataToSave.commission !== undefined && offerDataToSave.commission !== null) {
      console.log(`Utilisation de la commission fournie explicitement dans les données: ${offerDataToSave.commission}`);
    }
    // Sinon, essayons de calculer la commission en fonction du type d'offre
    else if (offerData.type === 'ambassador_offer' && offerData.user_id) {
      // Récupérer l'ambassador_id associé à cet utilisateur
      const { data: ambassadorData, error: ambassadorError } = await supabase
        .from('ambassadors')
        .select('id, commission_level_id')
        .eq('user_id', offerData.user_id)
        .single();
        
      if (!ambassadorError && ambassadorData) {
        offerDataToSave.ambassador_id = ambassadorData.id;
        
        // Si nous avons un montant et un niveau de commission, recalculons la commission
        if (offerDataToSave.amount && ambassadorData.commission_level_id) {
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
              console.log(`Commission calculée pour l'ambassadeur: ${commissionData.amount}`);
            }
          } catch (commError) {
            console.error("Error calculating commission during offer creation:", commError);
          }
        }
      }
    }
    
    // Ensure commission is a number and not NaN or undefined
    if (offerDataToSave.commission === undefined || offerDataToSave.commission === null || isNaN(Number(offerDataToSave.commission))) {
      // Apply default fallback
      offerDataToSave.commission = 0;
      console.log("Commission undefined, applying default value: 0");
    }
    
    // Log the final data being saved
    console.log("Données finales de l'offre avant sauvegarde:", {
      amount: offerDataToSave.amount,
      coefficient: offerDataToSave.coefficient,
      monthly_payment: offerDataToSave.monthly_payment,
      commission: offerDataToSave.commission,
      type: offerDataToSave.type
    });
    
    const { data, error } = await supabase
      .from('offers')
      .insert(offerDataToSave)
      .select()
      .single();
    
    if (error) {
      console.error("Erreur lors de l'insertion de l'offre:", error);
      return { data: null, error };
    }
    
    console.log("Offre créée avec succès, données:", data);
    return { data, error: null };
  } catch (error) {
    console.error("Error in createOffer:", error);
    return { data: null, error };
  }
};
