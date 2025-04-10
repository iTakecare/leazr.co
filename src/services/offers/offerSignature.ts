
import { getSupabaseClient } from "@/integrations/supabase/client";

/**
 * Vérifie si une offre a déjà été signée
 */
export const isOfferSigned = async (offerId: string): Promise<boolean> => {
  try {
    if (!offerId) return false;
    
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('offers')
      .select('signature_data, workflow_status')
      .eq('id', offerId)
      .maybeSingle();
      
    if (error) {
      console.error("Erreur lors de la vérification de signature:", error);
      return false;
    }
    
    return !!data?.signature_data || data?.workflow_status === 'approved';
  } catch (error) {
    console.error("Erreur lors de la vérification de signature:", error);
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
  try {
    if (!offerId || !signatureData) {
      console.error("Paramètres manquants pour l'enregistrement de la signature");
      return false;
    }
    
    const supabase = getSupabaseClient();
    
    console.log(`Enregistrement de la signature pour l'offre ${offerId}`);
    console.log(`Données de signature reçues (longueur): ${signatureData.length}`);
    console.log(`Nom du signataire: ${signerName}`);
    
    // Vérifier que la signature n'est pas vide ou juste un fond blanc
    if (signatureData.length < 1000) {
      console.error("Données de signature potentiellement invalides (trop courtes)");
      return false;
    }
    
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('offers')
      .update({
        signature_data: signatureData,
        signer_name: signerName,
        signed_at: now,
        workflow_status: 'approved',
        previous_status: 'sent' // Conserver l'état précédent pour référence
      })
      .eq('id', offerId)
      .select('id, signature_data');
      
    if (error) {
      console.error("Erreur lors de l'enregistrement de la signature:", error);
      return false;
    }
    
    // Vérifier que les données de signature ont bien été enregistrées
    if (!data || data.length === 0 || !data[0].signature_data) {
      console.error("Données de signature non enregistrées correctement");
      return false;
    }
    
    console.log("Signature enregistrée avec succès pour l'offre:", offerId);
    
    // Ajouter une entrée dans le journal des événements si nécessaire
    try {
      await supabase
        .from('offer_workflow_logs')
        .insert({
          offer_id: offerId,
          from_status: 'sent',
          to_status: 'approved',
          log_message: `Offre signée par ${signerName}`,
          created_at: now
        });
    } catch (logError) {
      console.error("Erreur lors de l'enregistrement du journal:", logError);
      // Ne pas bloquer le processus si l'enregistrement du journal échoue
    }
    
    return true;
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la signature:", error);
    return false;
  }
};

/**
 * Génère un lien de signature pour une offre
 */
export const generateSignatureLink = (offerId: string): string => {
  if (!offerId) return '';
  
  // Générer le lien sur l'URL actuelle
  const baseUrl = window.location.origin;
  return `${baseUrl}/client/sign/${offerId}`;
};
