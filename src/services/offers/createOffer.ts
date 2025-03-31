
import { supabase } from "@/integrations/supabase/client";
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
    
    // With RLS policies now in place, we can try direct insertion
    const { data, error } = await supabase
      .from('offers')
      .insert(dataToSend)
      .select();
    
    if (error) {
      console.error("Error inserting offer:", error);
      return { data: null, error };
    }
    
    return { data, error: null };
    
  } catch (error) {
    console.error("Error creating offer:", error);
    return { data: null, error };
  }
};
