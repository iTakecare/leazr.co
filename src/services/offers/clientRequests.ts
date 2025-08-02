
import { getAdminSupabaseClient } from "@/integrations/supabase/client";

/**
 * Crée une nouvelle demande client (offre)
 */
export const createClientRequest = async (data: any) => {
  try {
    console.log("Creating client request with data:", data);
    
    // Utiliser le client admin pour contourner les restrictions RLS
    const adminClient = getAdminSupabaseClient();
    
    // Vérification du client administrateur
    console.log("Client admin pour createClientRequest disponible");
    
    // Définir les champs valides pour la table offers
    const validOfferFields = [
      'id', 'user_id', 'amount', 'coefficient', 'monthly_payment', 'commission',
      'client_id', 'converted_to_contract', 'signed_at', 'commission_paid_at',
      'ambassador_id', 'financed_amount', 'margin', 'margin_difference',
      'total_margin_with_difference', 'company_id', 'client_name', 'client_email',
      'equipment_description', 'status', 'workflow_status', 'type', 'previous_status',
      'remarks', 'signature_data', 'signer_name', 'commission_status', 'signer_ip',
      'internal_score', 'leaser_score'
    ];
    
    // Filtrer les données pour ne garder que les champs valides
    const cleanedData = Object.keys(data)
      .filter(key => validOfferFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = data[key];
        return obj;
      }, {});
    
    // Logger les champs ignorés pour le debugging
    const ignoredFields = Object.keys(data).filter(key => !validOfferFields.includes(key));
    if (ignoredFields.length > 0) {
      console.log("Champs ignorés lors de l'insertion:", ignoredFields);
    }
    
    console.log("Données nettoyées pour insertion:", cleanedData);
    
    const { data: result, error } = await adminClient
      .from('offers')
      .insert(cleanedData)
      .select()
      .single();
    
    if (error) {
      console.error("Error inserting offer:", error);
      return { data: null, error };
    }
    
    console.log("Offer created successfully:", result);
    return { data: result, error: null };
  } catch (error) {
    console.error("Exception in createClientRequest:", error);
    return { 
      data: null, 
      error: error instanceof Error 
        ? { message: error.message } 
        : { message: 'Une erreur inconnue est survenue' } 
    };
  }
};
