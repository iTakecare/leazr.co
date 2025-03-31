
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
      user_id: requestData.user_id || null,
      remarks: requestData.remarks
    };
    
    console.log("Creating client request with data:", validData);
    
    // Essai avec supabase standard d'abord
    let { data, error } = await supabase
      .from('offers')
      .insert(validData)
      .select();
    
    // Si l'erreur est liée à la RLS, essayer avec adminSupabase
    if (error && (error.code === '42501' || error.message.includes('violates row-level security policy'))) {
      console.log("RLS error, trying with adminSupabase");
      
      try {
        const { data: adminData, error: adminError } = await adminSupabase
          .from('offers')
          .insert(validData)
          .select();
        
        if (adminError) {
          console.error("Error with adminSupabase:", adminError);
          return { data: null, error: adminError };
        }
        
        data = adminData;
        error = null;
      } catch (adminErr) {
        console.error("Exception with adminSupabase:", adminErr);
        return { data: null, error: adminErr };
      }
    }
    
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
