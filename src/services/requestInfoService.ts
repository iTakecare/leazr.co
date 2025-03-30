
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

const API_URL = "https://cifbetjefyfocafanlhv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.39wjC_Ld_qXnExyLgCawiip5hBDfCY6Hkb1rktomIxk";

/**
 * Crée une demande de produit (offre) à partir du catalogue public
 * Cette fonction utilise directement fetch API au lieu du client Supabase
 */
export const createProductRequest = async (data: ProductRequestData) => {
  try {
    console.log("Creating product request with data:", data);
    
    // Headers for all API requests
    const headers = {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    };
    
    // Première étape: Vérifier si un client existe déjà avec cet email
    let clientId: string | null = null;
    
    if (data.client_email) {
      try {
        // Rechercher un client existant par email
        const clientResponse = await fetch(
          `${API_URL}/rest/v1/clients?select=id&email=eq.${encodeURIComponent(data.client_email)}`,
          { 
            method: 'GET', 
            headers 
          }
        );
        
        if (clientResponse.ok) {
          const existingClients = await clientResponse.json();
          if (existingClients && existingClients.length > 0) {
            clientId = existingClients[0].id;
            console.log("Existing client found:", clientId);
          }
        } else {
          console.error("Error searching for existing client:", 
            await clientResponse.text());
        }
      } catch (error) {
        console.error("Exception when searching for client:", error);
      }
    }
    
    // Si aucun client n'existe, en créer un nouveau
    if (!clientId) {
      console.log("Creating new client");
      
      try {
        const clientData = {
          name: data.client_name,
          email: data.client_email,
          company: data.client_company,
          vat_number: data.client_company, // Utilisation temporaire de l'entreprise comme TVA
          status: 'lead'
        };
        
        const newClientResponse = await fetch(
          `${API_URL}/rest/v1/clients`,
          { 
            method: 'POST', 
            headers, 
            body: JSON.stringify(clientData) 
          }
        );
        
        if (newClientResponse.ok) {
          const newClient = await newClientResponse.json();
          if (newClient && newClient.length > 0) {
            clientId = newClient[0].id;
            console.log("New client created with ID:", clientId);
          }
        } else {
          console.error("Error creating new client:", 
            await newClientResponse.text());
        }
      } catch (error) {
        console.error("Exception when creating client:", error);
      }
    }

    // Seconde étape: Créer l'offre/demande
    console.log("Creating offer with client_id:", clientId);
    
    // Préparer les données de l'offre
    const offerData = {
      client_name: data.client_name,
      client_email: data.client_email,
      client_id: clientId, // Lier au client si créé/trouvé
      equipment_description: data.equipment_description,
      amount: data.amount,
      monthly_payment: data.monthly_payment,
      coefficient: 0, // Sera calculé par l'admin
      commission: 0,  // Sera calculé par l'admin
      status: 'pending',
      workflow_status: 'requested',
      type: 'client_request',
      user_id: null // Explicitement défini à null pour les demandes publiques
    };
    
    const offerResponse = await fetch(
      `${API_URL}/rest/v1/offers`,
      { 
        method: 'POST', 
        headers, 
        body: JSON.stringify(offerData) 
      }
    );
    
    if (!offerResponse.ok) {
      const errorText = await offerResponse.text();
      console.error("Error creating offer:", errorText);
      throw new Error("Impossible de créer la demande");
    }

    const offer = await offerResponse.json();
    
    if (!offer || offer.length === 0) {
      throw new Error("Aucune offre n'a été créée");
    }

    // Troisième étape: Ajouter des informations supplémentaires sous forme de note si fournies
    if (data.message && offer[0]) {
      try {
        const noteData = {
          offer_id: offer[0].id,
          content: `Message du client: ${data.message}\n\nInformations supplémentaires:\nEntreprise: ${data.client_company}\nQuantité: ${data.quantity}\nDurée: ${data.duration} mois`,
          type: 'client_note'
        };
        
        const noteResponse = await fetch(
          `${API_URL}/rest/v1/offer_notes`,
          { 
            method: 'POST', 
            headers, 
            body: JSON.stringify(noteData) 
          }
        );

        if (!noteResponse.ok) {
          console.error("Error adding note to offer:", 
            await noteResponse.text());
        }
      } catch (error) {
        console.error("Exception when adding note:", error);
      }
    }

    console.log("Product request created successfully:", offer[0]);
    return offer[0];
  } catch (error: any) {
    console.error("Error in product request service:", error);
    toast.error("Une erreur est survenue lors de l'envoi de votre demande. Veuillez réessayer.");
    throw error;
  }
};
