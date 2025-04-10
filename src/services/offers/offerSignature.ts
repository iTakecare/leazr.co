
import { getSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Vérifie si une offre est déjà signée
 */
export const isOfferSigned = async (offerId: string): Promise<boolean> => {
  try {
    if (!offerId) return false;
    
    const supabase = getSupabaseClient();
    
    // Récupérer l'offre pour vérifier si elle a une signature
    const { data, error } = await supabase
      .from('offers')
      .select('signature_data, workflow_status')
      .eq('id', offerId)
      .maybeSingle();
    
    if (error) {
      console.error('Erreur lors de la vérification de la signature:', error);
      return false;
    }
    
    // L'offre est considérée comme signée si elle a des données de signature
    // ou si son statut est "approved"
    return !!(data && (data.signature_data || data.workflow_status === 'approved'));
  } catch (err) {
    console.error('Erreur lors de la vérification de la signature:', err);
    return false;
  }
};

/**
 * Enregistre la signature d'une offre
 */
export const saveOfferSignature = async (
  offerId: string, 
  signatureData: string, 
  signerName: string
): Promise<boolean> => {
  if (!offerId || !signatureData) {
    console.error("ID d'offre ou données de signature manquants");
    return false;
  }
  
  try {
    console.log(`Enregistrement de la signature pour l'offre: ${offerId}`);
    console.log(`Nom du signataire: ${signerName}`);
    console.log(`Taille des données de signature: ${signatureData.length} caractères`);
    
    const supabase = getSupabaseClient();
    
    // Vérifier que l'offre existe avant de tenter d'enregistrer la signature
    const { data: existingOffer, error: checkError } = await supabase
      .from('offers')
      .select('id, client_name, workflow_status')
      .eq('id', offerId)
      .maybeSingle();
    
    if (checkError || !existingOffer) {
      console.error("Erreur lors de la vérification de l'offre:", checkError || "Offre non trouvée");
      return false;
    }
    
    console.log("Offre trouvée, statut actuel:", existingOffer.workflow_status);
    
    // Enregistrer la signature et mettre à jour le statut de l'offre
    const now = new Date().toISOString();
    
    const { error: updateError } = await supabase
      .from('offers')
      .update({
        signature_data: signatureData,
        signer_name: signerName || existingOffer.client_name, // Utiliser le nom du client si non fourni
        signed_at: now,
        workflow_status: 'approved',
        updated_at: now
      })
      .eq('id', offerId);
    
    if (updateError) {
      console.error("Erreur lors de l'enregistrement de la signature:", updateError);
      return false;
    }
    
    console.log("Signature enregistrée avec succès pour l'offre:", offerId);
    
    // Ajouter une entrée dans les logs de workflow
    try {
      const { error: logError } = await supabase
        .from('offer_workflow_logs')
        .insert({
          offer_id: offerId,
          previous_status: existingOffer.workflow_status,
          new_status: 'approved',
          reason: `Offre signée par ${signerName || existingOffer.client_name}`,
          user_id: null // Pas d'utilisateur authenticié pour une signature client
        });
      
      if (logError) {
        console.error("Erreur lors de l'ajout du log de workflow:", logError);
        // Ne pas échouer l'opération principale à cause d'une erreur de log
      }
    } catch (logErr) {
      console.error("Exception lors de l'ajout du log de workflow:", logErr);
    }
    
    return true;
  } catch (err) {
    console.error("Erreur lors de l'enregistrement de la signature:", err);
    return false;
  }
};

/**
 * Récupère les détails d'une offre pour un client
 */
export const getOfferForClient = async (offerId: string) => {
  try {
    if (!offerId) {
      console.error("ID d'offre manquant pour récupérer les détails");
      return null;
    }
    
    console.log("Récupération des détails de l'offre pour le client:", offerId);
    
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        clients:client_id (name, email, company)
      `)
      .eq('id', offerId)
      .maybeSingle();
    
    if (error) {
      console.error("Erreur lors de la récupération de l'offre:", error);
      throw error;
    }
    
    if (!data) {
      console.error("Aucune offre trouvée avec l'ID:", offerId);
      return null;
    }
    
    console.log("Détails de l'offre récupérés avec succès:", data.id);
    return data;
  } catch (err) {
    console.error("Exception lors de la récupération des détails de l'offre:", err);
    throw err;
  }
};

/**
 * Génère un lien de signature pour une offre
 */
export const generateSignatureLink = (offerId: string): string => {
  if (!offerId) return '';
  
  // Construire l'URL de base en fonction de l'environnement
  const baseUrl = window.location.origin;
  return `${baseUrl}/client/sign/${offerId}`;
};
