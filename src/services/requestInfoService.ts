
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
  company_id?: string;
}

export interface RequestInfoData {
  offerId: string;
  previousStatus: string;
  requestedDocs: string[];
  message?: string;
}

/**
 * Crée une demande de produit (offre) à partir du catalogue public
 * Cette fonction crée à la fois un client et une offre en utilisant une fonction Edge
 */
export const createProductRequest = async (data: ProductRequestData) => {
  try {
    console.log("Creating product request with data:", data);
    
    // Format du numéro de téléphone - supprimer le 0 après l'indicatif international
    if (data.phone) {
      // Recherche un format +XX 0XXXXXXXXX et remplace par +XX XXXXXXXXX
      data.phone = data.phone.replace(/^\+(\d+)\s0/, '+$1 ');
    }
    
    console.log("Calling Edge function create-product-request");
    // Appeler la fonction Edge pour créer la demande de produit
    const { data: responseData, error } = await supabase.functions.invoke(
      'create-product-request',
      {
        body: JSON.stringify(data),
      }
    );
    
    if (error) {
      console.error("Erreur lors de l'appel à la fonction Edge:", error);
      toast.error("Échec de création de la demande: " + error.message);
      throw new Error(`Échec de création de la demande: ${error.message}`);
    }
    
    console.log("Réponse de la fonction Edge:", responseData);
    
    // Sauvegarder les données de la demande dans sessionStorage
    sessionStorage.setItem('lastSubmittedRequest', JSON.stringify(responseData));
    sessionStorage.setItem('lastSubmittedOfferId', responseData.id);
    
    console.log("Request stored successfully:", responseData);
    toast.success("Votre demande a été envoyée avec succès");
    return responseData;
    
  } catch (error: any) {
    console.error("Error in product request service:", error);
    toast.error("Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer.");
    throw error;
  }
};
