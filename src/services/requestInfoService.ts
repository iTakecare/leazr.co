
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { createClientRequest } from "@/services/offers/clientRequests";
import { createClient } from "@/services/clientService";
import { supabase, adminSupabase } from "@/integrations/supabase/client";

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
        id: clientId, 
        name: data.client_company, 
        email: data.client_email,
        company: data.client_company,
        phone: data.phone || '',
        vat_number: data.client_vat_number || '',
        address: data.address || '',
        city: data.city || '',
        postal_code: data.postal_code || '',
        country: data.country || 'BE',
        status: 'active' as 'active' | 'inactive' | 'lead',
        contact_name: data.client_name
      };

      console.log("Attempting to create client:", clientData);
      
      // Créer le client - utilisant adminSupabase si nécessaire pour les requêtes publiques
      const client = await createClient(clientData);
      
      if (client) {
        console.log("Client created successfully with ID:", client.id);
      } else {
        console.error("Failed to create client, but will continue with offer creation");
      }
    } catch (error) {
      console.error("Error creating client:", error);
    }
    
    // Créer l'offre liée au client
    try {
      // Generate a new request ID for this offer
      const requestId = uuidv4();
      
      // Create a clean object without client_company
      const offerData = {
        id: requestId,
        client_id: clientId,
        client_name: data.client_name,
        client_email: data.client_email,
        equipment_description: data.equipment_description,
        amount: data.amount,
        monthly_payment: data.monthly_payment,
        coefficient: 1.0,
        commission: 0,
        type: 'client_request',
        workflow_status: 'requested',
        status: 'pending',
        remarks: data.message || '',
        user_id: null
      };
      
      console.log("Attempting to create offer:", offerData);
      
      // For public requests, always use the Admin client
      const { data: insertedOffer, error } = await adminSupabase
        .from('offers')
        .insert(offerData)
        .select();
        
      if (error) {
        console.error("Error creating offer with adminSupabase:", error);
        const result = await createClientRequest(offerData);
        console.log("Result from createClientRequest:", result);
      } else {
        console.log("Offer created successfully:", insertedOffer);
      }
      
      // Prepare data for session storage without client_company
      const requestDataForStorage = {
        id: requestId,
        client_id: clientId,
        client_name: data.client_name,
        client_email: data.client_email,
        client_company: data.client_company, // Keep this for display purposes in session storage only
        equipment_description: data.equipment_description,
        amount: data.amount,
        monthly_payment: data.monthly_payment,
        created_at: new Date().toISOString()
      };
      
      sessionStorage.setItem('lastSubmittedRequest', JSON.stringify(requestDataForStorage));
      sessionStorage.setItem('lastSubmittedOfferId', requestId);
      
      console.log("Request stored successfully:", requestDataForStorage);
      return requestDataForStorage;
      
    } catch (error) {
      console.error("Error creating offer:", error);
      // Store the data even if the creation failed
      const fallbackRequestData = {
        id: uuidv4(),
        client_id: clientId,
        client_name: data.client_name,
        client_email: data.client_email,
        client_company: data.client_company, // For display purposes only
        equipment_description: data.equipment_description,
        amount: data.amount,
        monthly_payment: data.monthly_payment,
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
