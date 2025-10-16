import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Génère un PDF d'offre via l'edge function render-offer-pdf
 * @param offerId ID de l'offre
 * @param templateSlug Slug du template (optionnel, défaut: 'itakecare-v1')
 * @returns Blob du PDF généré
 */
export const generateOfferPdf = async (
  offerId: string,
  templateSlug: string = 'itakecare-v1'
): Promise<Blob | null> => {
  try {
    console.log('[PDF-SERVICE] Generating PDF for offer:', offerId);
    console.log('[PDF-SERVICE] Using template:', templateSlug);

    // Appeler l'edge function
    const { data, error } = await supabase.functions.invoke('render-offer-pdf', {
      body: { 
        offerId, 
        templateSlug 
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (error) {
      console.error('[PDF-SERVICE] Error from edge function:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data received from PDF generation function');
    }

    // Convertir la réponse en Blob
    console.log('[PDF-SERVICE] PDF generated successfully');
    return new Blob([data], { type: 'application/pdf' });

  } catch (error: any) {
    console.error('[PDF-SERVICE] Exception:', error);
    toast.error(`Erreur lors de la génération du PDF: ${error.message}`);
    return null;
  }
};

/**
 * Télécharge un PDF d'offre
 * @param offerId ID de l'offre
 * @param fileName Nom du fichier (optionnel)
 * @param templateSlug Slug du template (optionnel)
 */
export const downloadOfferPdf = async (
  offerId: string,
  fileName?: string,
  templateSlug: string = 'itakecare-v1'
): Promise<boolean> => {
  try {
    const pdfBlob = await generateOfferPdf(offerId, templateSlug);
    
    if (!pdfBlob) {
      return false;
    }

    // Créer un lien de téléchargement
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || `Offre-${offerId}.pdf`;
    
    // Déclencher le téléchargement
    document.body.appendChild(link);
    link.click();
    
    // Nettoyer
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('[PDF-SERVICE] PDF downloaded successfully');
    return true;

  } catch (error: any) {
    console.error('[PDF-SERVICE] Download error:', error);
    return false;
  }
};

/**
 * Prévisualise un PDF d'offre dans un nouvel onglet
 * @param offerId ID de l'offre
 * @param templateSlug Slug du template (optionnel)
 */
export const previewOfferPdf = async (
  offerId: string,
  templateSlug: string = 'itakecare-v1'
): Promise<boolean> => {
  try {
    const pdfBlob = await generateOfferPdf(offerId, templateSlug);
    
    if (!pdfBlob) {
      return false;
    }

    // Créer une URL pour le PDF
    const url = URL.createObjectURL(pdfBlob);
    
    // Ouvrir dans un nouvel onglet
    window.open(url, '_blank');
    
    console.log('[PDF-SERVICE] PDF preview opened');
    return true;

  } catch (error: any) {
    console.error('[PDF-SERVICE] Preview error:', error);
    return false;
  }
};
