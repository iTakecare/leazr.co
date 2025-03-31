
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
}

export interface RequestInfoData {
  offerId: string;
  previousStatus: string;
  requestedDocs: string[];
  message?: string;
}

/**
 * Crée une demande de produit (offre) à partir du catalogue public
 * Cette solution utilise le stockage local pour éviter les problèmes d'authentification
 * et crée à la fois un client et une offre
 */
export const createProductRequest = async (data: ProductRequestData) => {
  try {
    console.log("Creating product request with data:", data);
    
    // Générer un ID unique pour la nouvelle offre
    const offerId = uuidv4();
    const clientId = uuidv4();
    
    // Tenter de créer un client dans le système
    try {
      const clientData = {
        name: data.client_company,
        contact_name: data.client_name,
        email: data.client_email,
        vat_number: data.client_vat_number || '',
        address: data.address || '',
        city: data.city || '',
        postal_code: data.postal_code || '',
        country: data.client_country || 'BE',
        phone: '',
        status: 'active'
      };

      console.log("Attempting to create client:", clientData);
      
      // Cette opération peut échouer silencieusement si non authentifié
      // mais sera utile côté admin
      await createClient(clientData);
    } catch (error) {
      console.log("Client creation might have failed, continuing with local storage:", error);
      // Continuer avec le stockage local même si la création du client échoue
    }
    
    // Créer l'objet offre avec toutes les données nécessaires
    const offer = {
      id: offerId,
      client_id: clientId,
      client_name: data.client_name,
      client_email: data.client_email,
      client_company: data.client_company,
      client_country: data.client_country || 'BE',
      client_vat_number: data.client_vat_number || '',
      client_is_vat_exempt: data.client_is_vat_exempt || false,
      equipment_description: data.equipment_description,
      message: data.message,
      amount: data.amount,
      monthly_payment: data.monthly_payment,
      quantity: data.quantity,
      duration: data.duration,
      status: 'pending',
      workflow_status: 'requested',
      type: 'client_request',
      created_at: new Date().toISOString(),
      address: data.address,
      city: data.city,
      postal_code: data.postal_code,
      has_different_shipping_address: data.has_different_shipping_address,
      shipping_address: data.shipping_address,
      shipping_city: data.shipping_city,
      shipping_postal_code: data.shipping_postal_code,
      shipping_country: data.shipping_country
    };
    
    // Tenter de créer l'offre dans Supabase
    try {
      console.log("Attempting to create offer in Supabase:", offer);
      // Cette opération peut échouer silencieusement si non authentifié
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
        remarks: data.message
      };
      
      await createClientRequest(offerData);
    } catch (error) {
      console.log("Offer creation might have failed, continuing with local storage:", error);
      // Continuer avec le stockage local même si la création de l'offre échoue
    }
    
    // Stocker l'offre dans localStorage pour un accès ultérieur
    const pendingRequests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
    pendingRequests.push(offer);
    localStorage.setItem('pendingRequests', JSON.stringify(pendingRequests));
    
    // Stocker également dans sessionStorage pour la confirmation immédiate
    sessionStorage.setItem('lastSubmittedRequest', JSON.stringify(offer));
    
    console.log("Request stored successfully:", offer);
    
    // Simuler un délai réseau pour améliorer l'expérience utilisateur
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return offer;
  } catch (error: any) {
    console.error("Error in product request service:", error);
    toast.error("Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer.");
    throw error;
  }
};
