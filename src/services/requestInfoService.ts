
import { supabase, getAdminSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductRequestData {
  client_name: string;
  client_email: string;
  client_company: string;
  client_contact_email?: string;
  equipment_description: string;
  message?: string;
  amount: number;
  monthly_payment: number;
  quantity: number;
  duration: number;
}

export interface RequestInfoData {
  offerId: string;
  previousStatus: string;
  requestedDocs: string[];
  message?: string;
}

/**
 * Crée une demande de produit (offre) à partir du catalogue public
 */
export const createProductRequest = async (data: ProductRequestData) => {
  try {
    console.log("Creating product request with data:", data);
    
    // Get admin client with proper configuration
    const adminSupabase = getAdminSupabaseClient();
    
    // First step: Check for existing client by email
    let clientId: string | null = null;
    
    if (data.client_email) {
      try {
        // Try to find existing client by email
        const { data: existingClient, error: clientFetchError } = await adminSupabase
          .from('clients')
          .select('id')
          .eq('email', data.client_email)
          .maybeSingle();
        
        if (clientFetchError) {
          console.error("Error searching for existing client:", clientFetchError);
        } else if (existingClient) {
          clientId = existingClient.id;
          console.log("Existing client found:", clientId);
        }
      } catch (error) {
        console.error("Exception when searching for client:", error);
      }
    }
    
    // If no client exists, create a new one
    if (!clientId) {
      console.log("Creating new client");
      
      try {
        const { data: newClient, error: clientCreateError } = await adminSupabase
          .from('clients')
          .insert([{
            name: data.client_name,
            email: data.client_email,
            company: data.client_company,
            vat_number: data.client_company, // Temporary use of company as VAT
            status: 'lead'
          }])
          .select()
          .single();
        
        if (clientCreateError) {
          console.error("Error creating new client:", clientCreateError);
          // Don't throw here, we'll still try to create the offer
        } else if (newClient) {
          clientId = newClient.id;
          console.log("New client created with ID:", clientId);
        }
      } catch (error) {
        console.error("Exception when creating client:", error);
      }
    }

    // Second step: Create the offer/request
    console.log("Creating offer with client_id:", clientId);
    
    // Prepare the offer data
    const offerData = {
      client_name: data.client_name,
      client_email: data.client_email,
      client_id: clientId, // Link to client if created/found
      equipment_description: data.equipment_description,
      amount: data.amount,
      monthly_payment: data.monthly_payment,
      coefficient: 0, // Will be calculated by admin
      commission: 0,  // Will be calculated by admin
      status: 'pending',
      workflow_status: 'requested',
      type: 'client_request'
    };
    
    const { data: offer, error: offerError } = await adminSupabase
      .from('offers')
      .insert([offerData])
      .select()
      .single();

    if (offerError) {
      console.error("Error creating offer:", offerError);
      throw new Error("Impossible de créer la demande");
    }

    // Third step: Add additional information as a note if provided
    if (data.message && offer) {
      try {
        const noteData = {
          offer_id: offer.id,
          content: `Message du client: ${data.message}\n\nInformations supplémentaires:\nEntreprise: ${data.client_company}\nQuantité: ${data.quantity}\nDurée: ${data.duration} mois`,
          type: 'client_note'
        };
        
        const { error: noteError } = await adminSupabase
          .from('offer_notes')
          .insert([noteData]);

        if (noteError) {
          console.error("Error adding note to offer:", noteError);
          // We don't throw here, as the offer was already created successfully
        }
      } catch (error) {
        console.error("Exception when adding note:", error);
      }
    }

    console.log("Product request created successfully:", offer);
    return offer;
  } catch (error: any) {
    console.error("Error in product request service:", error);
    toast.error("Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer.");
    throw error;
  }
};
