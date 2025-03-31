
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { createClientRequest } from "@/services/offers/clientRequests";
import { supabase, getAdminSupabaseClient } from "@/integrations/supabase/client";

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
    const requestId = uuidv4();
    
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
      
      let clientResult = null;
      let error = null;
      
      // Essayer d'abord avec le client standard
      const response = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();
      
      if (response.error) {
        console.warn("Échec avec le client standard, tentative avec le client admin:", response.error);
        
        // En cas d'échec avec le client standard, essayer avec le client admin
        const adminClient = getAdminSupabaseClient();
        const adminResponse = await adminClient
          .from('clients')
          .insert(clientData)
          .select()
          .single();
        
        clientResult = adminResponse.data;
        error = adminResponse.error;
      } else {
        clientResult = response.data;
        error = null;
      }
      
      if (error) {
        console.error("Erreur finale lors de la création du client:", error);
      } else if (clientResult) {
        console.log("Client created successfully with ID:", clientResult.id);
      }
    } catch (error) {
      console.error("Exception during client creation:", error);
    }
    
    // Créer l'offre liée au client, même si la création du client a échoué
    try {
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
        type: "client_request",
        workflow_status: "requested",
        status: "pending",
        remarks: data.message || '',
        user_id: null
      };
      
      console.log("Attempting to create offer:", offerData);
      
      let offerResult = null;
      let error = null;
      
      // Essayer d'abord avec le client standard
      const response = await supabase
        .from('offers')
        .insert(offerData)
        .select()
        .single();
      
      if (response.error) {
        console.warn("Échec de création d'offre avec le client standard, tentative avec le client admin:", response.error);
        
        // En cas d'échec avec le client standard, essayer avec le client admin
        const adminClient = getAdminSupabaseClient();
        const adminResponse = await adminClient
          .from('offers')
          .insert(offerData)
          .select()
          .single();
        
        offerResult = adminResponse.data;
        error = adminResponse.error;
      } else {
        offerResult = response.data;
        error = null;
      }
      
      if (error) {
        console.error("Erreur finale lors de la création de l'offre:", error);
        // Lever une exception pour informer l'appelant de l'échec
        throw new Error(`Échec de création de l'offre: ${error.message}`);
      }
      
      console.log("Offer created successfully:", offerResult);
      
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
        id: requestId,
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
      throw error; // Rethrow to inform the caller
    }
    
  } catch (error: any) {
    console.error("Error in product request service:", error);
    toast.error("Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer.");
    throw error;
  }
};
