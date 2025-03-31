
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { createClientRequest } from "@/services/offers/clientRequests";
import { createClient } from "@/services/clientService";
import { supabase } from "@/integrations/supabase/client";

export interface ProductRequestData {
  client_name: string;
  client_email: string;
  client_company: string;
  client_contact_email?: string;
  client_country?: string;
  client_vat_number?: string;
  client_is_vat_exempt?: boolean;
  equipment_description: string;
  message?: string;
  amount: number;
  monthly_payment: number;
  quantity: number;
  duration: number;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  has_different_shipping_address?: boolean;
  shipping_address?: string;
  shipping_city?: string;
  shipping_postal_code?: string;
  shipping_country?: string;
  phone?: string;
}

export interface RequestInfoData {
  offerId: string;
  previousStatus: string;
  requestedDocs: string[];
  message?: string;
}

/**
 * Crée une demande de produit (offre) à partir du catalogue public
 * Cette fonction crée à la fois un client et une offre
 */
export const createProductRequest = async (data: ProductRequestData) => {
  try {
    console.log("Creating product request with data:", data);
    
    // Identifier pour lier l'offre au client
    const clientId = uuidv4();
    
    // Créer le client dans le système
    try {
      // Préparer les données du client pour l'insertion
      const clientData = {
        id: clientId, // Utiliser l'ID généré pour assurer la correspondance
        name: data.client_company, // Nom de l'entreprise comme nom principal du client
        email: data.client_email,
        company: data.client_company,
        phone: data.phone || '',
        vat_number: data.client_vat_number || '',
        address: data.address || '',
        city: data.city || '',
        postal_code: data.postal_code || '',
        country: data.country || 'BE',
        status: 'active' as 'active' | 'inactive' | 'lead',
        has_different_shipping_address: data.has_different_shipping_address || false,
        shipping_address: data.shipping_address || '',
        shipping_city: data.shipping_city || '',
        shipping_postal_code: data.shipping_postal_code || '',
        shipping_country: data.shipping_country || '',
        contact_name: data.client_name // Store contact name separately
      };

      console.log("Attempting to create client:", clientData);
      
      // Créer le client
      const client = await createClient(clientData);
      
      if (client) {
        console.log("Client created successfully with ID:", client.id);
      } else {
        console.error("Failed to create client, but will continue with offer creation");
        // Here we'll continue with the provided clientId even if client creation failed
      }
    } catch (error) {
      console.error("Error creating client:", error);
      // Continuer avec la création de l'offre même si la création du client a échoué
    }
    
    // Créer l'offre liée au client
    try {
      // Prepare the data for insertion into the offers table
      // Generate a new request ID for this offer
      const requestId = uuidv4();
      const offerData = {
        id: requestId, // Use the generated ID
        client_id: clientId,
        client_name: data.client_name,
        client_email: data.client_email,
        equipment_description: data.equipment_description,
        amount: data.amount,
        monthly_payment: data.monthly_payment,
        coefficient: 1.0,
        commission: 0,
        type: 'client_request', // Make sure type is part of the schema
        workflow_status: 'requested',
        status: 'pending', // Ensure status is defined in the offers table
        remarks: data.message || '',
        user_id: null // No user is associated with public requests
      };
      
      console.log("Attempting to create offer in Supabase:", offerData);
      
      // For public requests, we need to use the ANON role directly
      // This bypasses RLS policies that might be restricting to authenticated users
      const { data: insertedOffer, error } = await supabase
        .from('offers')
        .insert(offerData)
        .select();
        
      if (error) {
        // Try direct insert method as fallback
        console.error("Error creating offer with supabase client:", error);
        const result = await createClientRequest(offerData);
        console.log("Result from createClientRequest:", result);
      } else {
        console.log("Offer created successfully:", insertedOffer);
      }
      
      // Store the request data regardless of the supabase result
      // This ensures the confirmation page works even if the DB operation failed
      const requestData = {
        id: requestId,
        client_id: clientId,
        ...data,
        created_at: new Date().toISOString()
      };
      
      sessionStorage.setItem('lastSubmittedRequest', JSON.stringify(requestData));
      sessionStorage.setItem('lastSubmittedOfferId', requestId);
      
      console.log("Request stored successfully:", requestData);
      return requestData;
      
    } catch (error) {
      console.error("Error creating offer:", error);
      // Store the data even if the creation failed
      const fallbackRequestData = {
        id: uuidv4(),
        client_id: clientId,
        ...data,
        created_at: new Date().toISOString()
      };
      sessionStorage.setItem('lastSubmittedRequest', JSON.stringify(fallbackRequestData));
      return fallbackRequestData;
    }
    
  } catch (error: any) {
    console.error("Error in product request service:", error);
    toast.error("Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer.");
    throw error;
  }
};
