
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { createClientRequest } from "@/services/offers/clientRequests";
import { createClient } from "@/services/clientService";

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
      const clientData = {
        id: clientId, // Utiliser l'ID généré pour assurer la correspondance
        name: data.client_company,
        contact_name: data.client_name,
        email: data.client_email,
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
        shipping_country: data.shipping_country || ''
      };

      console.log("Creating client with data:", clientData);
      
      await createClient(clientData);
      console.log("Client created successfully with ID:", clientId);
      
    } catch (error) {
      console.error("Error creating client:", error);
      // Continuer avec la création de l'offre même si la création du client a échoué
    }
    
    // Créer l'offre liée au client
    try {
      console.log("Creating offer for client:", clientId);
      
      const offerData = {
        client_id: clientId,
        client_name: data.client_name,
        client_email: data.client_email,
        equipment_description: data.equipment_description,
        amount: data.amount,
        monthly_payment: data.monthly_payment,
        coefficient: 1.0,
        commission: 0,
        user_id: null,
        workflow_status: 'requested',
        status: 'pending',
        remarks: data.message || ''
      };
      
      const result = await createClientRequest(offerData);
      console.log("Offer created successfully:", result);
      
      // Stocker l'ID de l'offre créée dans sessionStorage pour référence ultérieure
      if (result.data && result.data.length > 0) {
        const offerId = result.data[0].id;
        sessionStorage.setItem('lastSubmittedOfferId', offerId);
      }
      
    } catch (error) {
      console.error("Error creating offer:", error);
      // Stocker quand même les données pour référence
    }
    
    // Stocker les données de la demande dans sessionStorage pour la confirmation
    const requestData = {
      ...data,
      client_id: clientId,
      created_at: new Date().toISOString()
    };
    sessionStorage.setItem('lastSubmittedRequest', JSON.stringify(requestData));
    
    return requestData;
    
  } catch (error: any) {
    console.error("Error in product request service:", error);
    toast.error("Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer.");
    throw error;
  }
};
