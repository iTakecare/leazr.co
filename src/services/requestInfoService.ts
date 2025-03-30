
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductRequestData {
  client_name: string;
  client_email: string;
  client_company: string;
  client_contact_email: string;
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
    
    // Créer une offre/demande dans la table offers
    const { data: offer, error } = await supabase
      .from('offers')
      .insert([
        {
          client_name: data.client_name,
          client_email: data.client_email,
          equipment_description: data.equipment_description,
          amount: data.amount * data.quantity,
          monthly_payment: data.monthly_payment,
          coefficient: 0, // Sera calculé par l'admin
          commission: 0,  // Sera calculé par l'admin
          status: 'pending',
          workflow_status: 'requested',
          type: 'client_request'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Erreur lors de la création de la demande:", error);
      throw new Error("Impossible de créer la demande");
    }

    // Créer un nouveau client à partir des informations fournies
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert([
        {
          name: data.client_name,
          email: data.client_email,
          company: data.client_company,
          vat_number: data.client_company, // Utiliser le numéro de TVA comme identifiant de l'entreprise
          status: 'lead'
        }
      ])
      .select()
      .single();
      
    if (clientError) {
      console.error("Erreur lors de la création du client:", clientError);
      // On continue même si la création du client échoue, ce n'est pas bloquant
    } else if (client && offer) {
      // Lier l'offre au client si les deux ont été créés avec succès
      const { error: updateError } = await supabase
        .from('offers')
        .update({ client_id: client.id })
        .eq('id', offer.id);
        
      if (updateError) {
        console.error("Erreur lors de la liaison de l'offre au client:", updateError);
      }
    }

    // Ajouter des informations supplémentaires dans un commentaire ou une autre table si nécessaire
    if (data.message) {
      const { error: noteError } = await supabase
        .from('offer_notes')
        .insert([
          {
            offer_id: offer.id,
            content: `Message du client: ${data.message}\n\nInformations supplémentaires:\nEntreprise: ${data.client_company}\nQuantité: ${data.quantity}\nDurée: ${data.duration} mois`,
            type: 'client_note'
          }
        ]);

      if (noteError) {
        console.error("Erreur lors de l'ajout de la note:", noteError);
      }
    }

    console.log("Product request created successfully:", offer);
    return offer;
  } catch (error) {
    console.error("Erreur dans le service de demande de produit:", error);
    toast.error("Une erreur est survenue lors de l'envoi de votre demande.");
    throw error;
  }
};
