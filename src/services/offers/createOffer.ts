
import { supabase } from "@/integrations/supabase/client";
import { OfferData } from "./types";

export const createOffer = async (offerData: OfferData) => {
  try {
    console.log("Creating offer with data:", offerData);
    
    // Create a clean object with only the columns that exist in the database
    const dataToSend = {
      client_id: offerData.client_id,
      client_name: offerData.client_name,
      client_email: offerData.client_email,
      equipment_description: offerData.equipment_description,
      amount: offerData.amount,
      coefficient: offerData.coefficient,
      monthly_payment: offerData.monthly_payment,
      commission: offerData.commission,
      user_id: offerData.user_id === 'user-123' ? 
        '00000000-0000-0000-0000-000000000000' : offerData.user_id,
      type: offerData.type || 'admin_offer',
      remarks: offerData.remarks,
      workflow_status: offerData.workflow_status
    };
    
    const { data, error } = await supabase
      .from('offers')
      .insert(dataToSend)
      .select();
    
    if (error) {
      console.error("Error creating offer:", error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error("Error creating offer:", error);
    return { data: null, error };
  }
};
