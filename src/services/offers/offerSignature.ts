
import { getSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Récupère les données d'une offre pour un client
 */
export const getOfferForClient = async (offerId: string): Promise<any> => {
  try {
    if (!offerId) return null;
    
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('offers')
      .select('*, clients(*)')
      .eq('id', offerId)
      .maybeSingle();
    
    if (error) {
      console.error('Erreur lors de la récupération de l\'offre:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'offre:', error);
    return null;
  }
};

/**
 * Vérifie si une offre a déjà été signée
 */
export const isOfferSigned = async (offerId: string): Promise<boolean> => {
  try {
    if (!offerId) return false;
    
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('offers')
      .select('signed_at, signature_data')
      .eq('id', offerId)
      .maybeSingle();
    
    if (error) {
      console.error('Erreur lors de la vérification de la signature:', error);
      return false;
    }
    
    return !!(data?.signed_at && data?.signature_data);
  } catch (error) {
    console.error('Erreur lors de la vérification de la signature:', error);
    return false;
  }
};

/**
 * Sauvegarde la signature d'une offre
 */
export const saveOfferSignature = async (
  offerId: string, 
  signatureData: string, 
  signerName: string,
  approvalText: string = "Bon pour accord"
): Promise<boolean> => {
  try {
    if (!offerId || !signatureData) {
      console.error("ID d'offre ou données de signature manquants");
      return false;
    }
    
    const supabase = getSupabaseClient();
    
    console.log(`Sauvegarde de la signature pour l'offre ${offerId} (taille: ${signatureData.length} caractères)`);
    
    // Mettre à jour l'offre avec les données de signature
    const { data, error } = await supabase
      .from('offers')
      .update({
        signature_data: signatureData,
        signer_name: signerName,
        approval_text: approvalText,
        signed_at: new Date().toISOString(),
        workflow_status: 'approved'
      })
      .eq('id', offerId)
      .select();
    
    if (error) {
      console.error('Erreur lors de la sauvegarde de la signature:', error);
      return false;
    }
    
    console.log('Signature enregistrée avec succès pour l\'offre:', offerId);
    return true;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la signature:', error);
    return false;
  }
};

/**
 * Génère un lien de signature pour une offre
 */
export const generateSignatureLink = (offerId: string): string => {
  if (!offerId) return '';
  
  // Génération de l'URL de base du site
  const baseUrl = window.location.origin;
  
  // Construction du lien vers la page de signature
  // S'assurer que le chemin correspond exactement à la route configurée dans l'application
  const signatureLink = `${baseUrl}/client/sign/${offerId}`;
  
  console.log("Generated signature link:", signatureLink);
  return signatureLink;
};
