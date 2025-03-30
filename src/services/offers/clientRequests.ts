
import { supabase } from "@/integrations/supabase/client";
import { OfferData } from "./types";
import { toast } from "sonner";

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
      type: 'client_request',
      status: 'pending',
      workflow_status: 'client_waiting',
      user_id: requestData.user_id === 'user-123' ? 
        '00000000-0000-0000-0000-000000000000' : requestData.user_id,
      remarks: requestData.remarks // Include the remarks field directly
    };
    
    console.log("Creating client request with data:", validData);
    
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

// Function to handle the product request from the public catalog
export const createProductRequestOffer = async (requestData: any) => {
  try {
    // Format the equipment description
    const equipmentDescription = `${requestData.equipment_description} (${requestData.quantity || 1}x) - Durée: ${requestData.duration || 24} mois`;
    
    // Create an offer object
    const offerData = {
      client_name: requestData.client_name,
      client_email: requestData.client_email,
      equipment_description: equipmentDescription,
      amount: requestData.amount,
      coefficient: 0, // Will be calculated by admin
      monthly_payment: requestData.monthly_payment,
      commission: 0, // Will be calculated by admin
      user_id: '00000000-0000-0000-0000-000000000000', // System user ID
      type: 'client_request',
      status: 'pending',
      workflow_status: 'requested',
      remarks: requestData.message || '' // Store any client message as remarks
    };
    
    // Create the client request in the database
    const result = await createClientRequest(offerData);
    
    if (result.error) {
      throw new Error("Failed to create client request");
    }
    
    // Add a note with additional client information if needed
    if (requestData.client_company || requestData.client_contact_email) {
      const { error: noteError } = await supabase
        .from('offer_notes')
        .insert([
          {
            offer_id: result.data[0].id,
            content: `Information client supplémentaire:
            Entreprise: ${requestData.client_company || 'Non spécifiée'}
            Email de contact: ${requestData.client_contact_email || requestData.client_email}
            Quantité: ${requestData.quantity || 1}
            Durée: ${requestData.duration || 24} mois`,
            type: 'client_note'
          }
        ]);
        
      if (noteError) {
        console.error("Error adding client note:", noteError);
      }
    }
    
    return { success: true, data: result.data };
  } catch (error) {
    console.error("Error in createProductRequestOffer:", error);
    return { success: false, error };
  }
};
