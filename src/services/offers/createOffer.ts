
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
      workflow_status: offerData.workflow_status,
      status: offerData.workflow_status === 'draft' ? 'pending' : 'pending'
    };
    
    // Only add remarks if it's provided and not undefined
    if (offerData.remarks !== undefined) {
      dataToSend['remarks'] = offerData.remarks;
    }
    
    console.log("Sending data to database:", dataToSend);
    
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
