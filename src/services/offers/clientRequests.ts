
import { supabase } from "@/integrations/supabase/client";
import { OfferData } from "./types";

export const createClientRequest = async (requestData: OfferData): Promise<string | null> => {
  try {
    const validData = {
      ...requestData,
      type: 'client_request',
      status: 'pending',
      workflow_status: 'client_waiting',
      user_id: requestData.user_id === 'user-123' ? 
        '00000000-0000-0000-0000-000000000000' : requestData.user_id
    };
    
    const { data, error } = await supabase
      .from('offers')
      .insert(validData)
      .select();
    
    if (error) throw error;
    
    return data?.[0]?.id || null;
  } catch (error) {
    console.error("Error creating client request:", error);
    return null;
  }
};
