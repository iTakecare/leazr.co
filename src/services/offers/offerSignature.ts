
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

    if (updateError) throw updateError;

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
    const { data, error } = await supabase
      .from('offers')
      .select('signature_data, workflow_status')
      .eq('id', offerId)
      .single();

    if (error) throw error;
    
    return !!data.signature_data || data.workflow_status === 'approved';
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
      .single();

    if (error) {
      console.error("Erreur Supabase:", error);
      throw error;
    }
    
    console.log("Données récupérées pour l'offre:", data ? "Offre trouvée" : "Aucune offre trouvée");
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
  // Base URL de l'application
  const baseUrl = window.location.origin;
  // URL de signature
  return `${baseUrl}/client/sign-offer/${offerId}`;
};
