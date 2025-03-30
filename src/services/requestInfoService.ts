
import { toast } from "sonner";
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Import des constantes depuis le client
import { SUPABASE_URL, SERVICE_ROLE_KEY } from "@/integrations/supabase/client";

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
    
    // Créer une nouvelle instance du client Supabase avec la clé de service pour s'assurer que les en-têtes sont correctement définis
    const adminSupabase = createClient<Database>(
      SUPABASE_URL,
      SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        },
        global: {
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
          },
        },
      }
    );
    
    // Première étape: Vérifier si un client existe déjà avec cet email
    let clientId: string | null = null;
    
    if (data.client_email) {
      try {
        // Rechercher un client existant par email
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
        
        const { data: newClient, error: clientCreateError } = await adminSupabase
          .from('clients')
          .insert([clientData])
          .select();
        
        if (clientCreateError) {
          console.error("Error creating new client:", clientCreateError);
          // Ne pas lever d'erreur ici, nous allons quand même essayer de créer l'offre
        } else if (newClient && newClient.length > 0) {
          clientId = newClient[0].id;
          console.log("New client created with ID:", clientId);
        }
      } catch (error) {
        console.error("Exception when creating client:", error);
      }
    }

    // Seconde étape: Créer l'offre/demande sans dépendre de la création du client
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
    
    // Utiliser directement l'instance adminSupabase pour éviter les problèmes d'authentification
    const { data: offer, error: offerError } = await adminSupabase
      .from('offers')
      .insert([offerData])
      .select();

    if (offerError) {
      console.error("Error creating offer:", offerError);
      throw new Error("Impossible de créer la demande");
    }

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
        
        const { error: noteError } = await adminSupabase
          .from('offer_notes')
          .insert([noteData]);

        if (noteError) {
          console.error("Error adding note to offer:", noteError);
          // Nous ne levons pas d'erreur ici, car l'offre a déjà été créée avec succès
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
