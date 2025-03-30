
import { supabase } from "@/integrations/supabase/client";
import { OfferData } from "./types";

export const createClientRequest = async (requestData: OfferData) => {
  try {
    // Vérifier que les valeurs numériques sont correctes
    const amount = typeof requestData.amount === 'number' ? requestData.amount : parseFloat(requestData.amount || '0');
    const monthlyPayment = typeof requestData.monthly_payment === 'number' ? 
      requestData.monthly_payment : parseFloat(requestData.monthly_payment || '0');
    const coefficient = typeof requestData.coefficient === 'number' ? 
      requestData.coefficient : parseFloat(requestData.coefficient || '0');
    const commission = typeof requestData.commission === 'number' ?
      requestData.commission : parseFloat(requestData.commission || '0');
    
    console.log("Preparing client request with validated data:", {
      amount,
      monthlyPayment,
      coefficient,
      commission,
      equipment: requestData.equipment_description
    });
    
    // Create a clean object with only the columns that exist in the database
    const validData = {
      client_id: requestData.client_id,
      client_name: requestData.client_name,
      client_email: requestData.client_email,
      equipment_description: requestData.equipment_description,
      amount: amount,
      coefficient: coefficient,
      monthly_payment: monthlyPayment,
      commission: commission,
      type: 'client_request',
      status: 'pending',
      workflow_status: 'client_waiting',
      user_id: requestData.user_id === 'user-123' || requestData.user_id === 'anonymous' ? 
        '00000000-0000-0000-0000-000000000000' : requestData.user_id,
      remarks: requestData.remarks
    };
    
    console.log("Creating client request with validated data:", validData);
    
    const { data, error } = await supabase
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
