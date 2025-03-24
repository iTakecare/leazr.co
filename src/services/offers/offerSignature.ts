
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Enregistre la signature d'une offre
 * @param offerId ID de l'offre
 * @param signatureData URL de données de la signature
 * @param signerName Nom du signataire
 * @returns Succès de l'opération
 */
export const saveOfferSignature = async (
  offerId: string, 
  signatureData: string,
  signerName: string
): Promise<boolean> => {
  try {
    console.log("Début de l'enregistrement de la signature pour l'offre:", offerId);
    
    // 1. Mettre à jour le statut de l'offre en "approved"
    const { error: updateError } = await supabase
      .from('offers')
      .update({
        workflow_status: 'approved',
        signature_data: signatureData,
        signer_name: signerName,
        signed_at: new Date().toISOString()
      })
      .eq('id', offerId);

    if (updateError) {
      console.error("Erreur lors de la mise à jour de l'offre:", updateError);
      throw updateError;
    }

    // 2. Ajouter une entrée dans les logs du workflow
    const { error: logError } = await supabase
      .from('offer_workflow_logs')
      .insert({
        offer_id: offerId,
        previous_status: 'sent', // On suppose que l'offre était en statut "sent"
        new_status: 'approved',
        user_id: null, // Signature par le client, pas par un utilisateur
        reason: `Offre signée électroniquement par ${signerName}`
      });

    if (logError) console.error("Erreur log:", logError);

    console.log("Signature enregistrée avec succès pour l'offre:", offerId);
    return true;
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la signature:", error);
    return false;
  }
};

/**
 * Vérifie si une offre est déjà signée
 * @param offerId ID de l'offre
 * @returns True si l'offre est déjà signée
 */
export const isOfferSigned = async (offerId: string): Promise<boolean> => {
  try {
    console.log("Vérification si l'offre est déjà signée:", offerId);
    
    const { data, error } = await supabase
      .from('offers')
      .select('signature_data, workflow_status')
      .eq('id', offerId)
      .maybeSingle();

    if (error) {
      console.error("Erreur lors de la vérification de signature:", error);
      throw error;
    }
    
    const isSigned = !!data?.signature_data || data?.workflow_status === 'approved';
    console.log("Résultat de la vérification de signature:", isSigned);
    
    return isSigned;
  } catch (error) {
    console.error("Erreur lors de la vérification de la signature:", error);
    return false;
  }
};

/**
 * Récupère les détails d'une offre par son ID public (pour le client)
 * Ne révèle que les informations nécessaires pour le client
 */
export const getOfferForClient = async (offerId: string) => {
  try {
    console.log("Récupération de l'offre pour le client:", offerId);
    
    if (!offerId) {
      console.error("ID d'offre non fourni");
      throw new Error("ID d'offre non fourni");
    }
    
    // Utiliser maybeSingle au lieu de single pour éviter les erreurs quand aucun résultat n'est trouvé
    const { data, error } = await supabase
      .from('offers')
      .select(`
        id,
        client_name,
        client_email,
        equipment_description,
        amount,
        monthly_payment,
        coefficient,
        workflow_status,
        signature_data,
        signer_name,
        signed_at,
        remarks
      `)
      .eq('id', offerId)
      .maybeSingle();

    if (error) {
      console.error("Erreur Supabase lors de la récupération de l'offre:", error);
      throw error;
    }
    
    if (!data) {
      console.error("Aucune offre trouvée avec l'ID:", offerId);
      throw new Error(`Aucune offre trouvée avec l'ID: ${offerId}`);
    }
    
    console.log("Données récupérées pour l'offre:", offerId, "Statut:", data.workflow_status);
    return data;
  } catch (error) {
    console.error("Erreur détaillée lors de la récupération de l'offre:", error);
    throw error;
  }
};

/**
 * Génère un lien de signature pour une offre
 */
export const generateSignatureLink = (offerId: string): string => {
  if (!offerId) return "";
  
  // Base URL de l'application
  const baseUrl = window.location.origin;
  // URL de signature
  return `${baseUrl}/client/sign-offer/${offerId}`;
};
