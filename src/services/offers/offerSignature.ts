
import { getSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "sonner";

const supabase = getSupabaseClient();

/**
 * Enregistre la signature d'une offre
 * @param offerId ID de l'offre
 * @param signatureData URL de données de la signature
 * @param signerName Nom du signataire
 * @param ipAddress Adresse IP du signataire (optionnelle)
 * @returns Succès de l'opération
 */
export const saveOfferSignature = async (
  offerId: string, 
  signatureData: string,
  signerName: string,
  ipAddress?: string
): Promise<boolean> => {
  try {
    console.log("Début de l'enregistrement de la signature pour l'offre:", offerId);
    console.log("Taille des données de signature:", signatureData.length, "caractères");
    
    // Vérification de la validité de la signature
    if (!signatureData || !signatureData.startsWith('data:image/')) {
      console.error("Données de signature invalides");
      return false;
    }
    
    // Créer un timestamp ISO 8601 précis avec millisecondes pour la valeur légale
    const now = new Date().toISOString();
    
    // 1. Mettre à jour le statut de l'offre en "approved"
    const { error: updateError } = await supabase
      .from('offers')
      .update({
        workflow_status: 'approved',
        signature_data: signatureData,
        signer_name: signerName,
        signed_at: now,
        signer_ip: ipAddress || null // Stocker l'adresse IP du signataire
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
        reason: `Offre signée électroniquement par ${signerName}${ipAddress ? ` depuis l'adresse IP ${ipAddress}` : ''}`
      });

    if (logError) {
      console.error("Erreur lors de l'ajout du log de workflow:", logError);
      // Ne pas bloquer le processus si l'ajout du log échoue
    }

    console.log("Signature enregistrée avec succès pour l'offre:", offerId);
    console.log("Timestamp précis:", now);
    console.log("Adresse IP du signataire:", ipAddress || "Non disponible");
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
 * Génère un lien de signature pour une offre
 */
export const generateSignatureLink = (offerId: string): string => {
  if (!offerId) return "";
  
  // Base URL de l'application
  const baseUrl = window.location.origin;
  // URL de signature
  return `${baseUrl}/client/sign-offer/${offerId}`;
};

/**
 * Récupère une offre pour un client spécifique
 * @param offerId ID de l'offre
 * @returns Les données de l'offre ou null si non trouvée
 */
export const getOfferForClient = async (offerId: string) => {
  try {
    console.log("Récupération de l'offre pour le client:", offerId);
    
    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        clients:client_id (
          id, 
          name,
          email, 
          company,
          phone,
          address,
          postal_code,
          city,
          vat_number
        )
      `)
      .eq('id', offerId)
      .single();

    if (error) {
      console.error("Erreur lors de la récupération de l'offre:", error);
      throw error;
    }

    console.log("Offre récupérée avec succès:", data.id);
    return data;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'offre:", error);
    return null;
  }
};

// Importation des fonctions depuis offerPdf.ts
import { getOfferDataForPdf, generateAndDownloadOfferPdf } from './offerPdf';

// Ré-exporter ces fonctions pour maintenir la compatibilité
export { generateAndDownloadOfferPdf, getOfferDataForPdf };

