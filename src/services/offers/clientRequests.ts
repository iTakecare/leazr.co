
import { supabase, adminSupabase } from "@/integrations/supabase/client";
import { OfferData } from "./types";

export const createClientRequest = async (requestData: OfferData) => {
  try {
    // Create a clean object with only the columns that exist in the database
    const validData = {
      client_id: requestData.client_id,
      client_name: requestData.client_name,
      client_email: requestData.client_email,
      equipment_description: requestData.equipment_description,
      amount: requestData.amount,
      coefficient: requestData.coefficient,
      monthly_payment: requestData.monthly_payment,
      commission: requestData.commission,
      type: requestData.type || 'client_request',
      status: requestData.status || 'pending',
      workflow_status: requestData.workflow_status || 'client_waiting',
      user_id: requestData.user_id === 'user-123' ? 
        '00000000-0000-0000-0000-000000000000' : requestData.user_id,
      remarks: requestData.remarks
    };
    
    console.log("Creating client request with data:", validData);
    
    // Use adminSupabase to bypass RLS for public client requests
    const { data, error } = await adminSupabase
      .from('offers')
      .insert(validData)
      .select();
    
    if (error) {
      console.error("Error creating client request:", error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error("Error creating client request:", error);
    return { data: null, error };
  }
};
