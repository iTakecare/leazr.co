
import { supabase, adminSupabase } from "@/integrations/supabase/client";
import { OfferData } from "./types";

export const createOffer = async (offerData: OfferData) => {
  try {
    console.log("Creating offer with data:", offerData);
    
    // Création d'un objet propre avec uniquement les colonnes qui existent dans la base de données
    const dataToSend = {
      client_id: offerData.client_id,
      client_name: offerData.client_name,
      client_email: offerData.client_email,
      equipment_description: offerData.equipment_description,
      amount: offerData.amount,
      coefficient: offerData.coefficient,
      monthly_payment: offerData.monthly_payment,
      commission: offerData.commission,
      user_id: offerData.user_id || null,
      type: offerData.type || 'admin_offer',
      workflow_status: offerData.workflow_status,
      status: offerData.workflow_status === 'draft' ? 'pending' : 'pending',
      remarks: offerData.remarks 
    };
    
    console.log("Sending data to database:", dataToSend);
    
    // Toujours essayer d'abord avec adminSupabase pour les requêtes publiques
    try {
      const { data, error } = await adminSupabase
        .from('offers')
        .insert(dataToSend)
        .select();
      
      if (error) {
        console.error("Error with adminSupabase:", error);
        
        // Si échec, tenter avec supabase standard (pour utilisateurs authentifiés)
        const { data: standardData, error: standardError } = await supabase
          .from('offers')
          .insert(dataToSend)
          .select();
        
        if (standardError) {
          console.error("Error with standard supabase:", standardError);
          return { data: null, error: standardError };
        }
        
        return { data: standardData, error: null };
      }
      
      return { data, error: null };
      
    } catch (error) {
      console.error("Exception during offer creation:", error);
      return { data: null, error };
    }
  } catch (error) {
    console.error("Error creating offer:", error);
    return { data: null, error };
  }
};
