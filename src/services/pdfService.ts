import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// Fallback client-side PDF generation
// @ts-ignore
import html2pdf from "html2pdf.js";

// Fallback: transforme du HTML (renvoyé par l’edge) en PDF côté client
const htmlToPdfBlob = async (html: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-100000px';
      container.style.top = '0';
      container.style.width = '794px'; // A4 width @96dpi
      container.style.background = '#fff';
      container.innerHTML = html;
      document.body.appendChild(container);

      const opt: any = {
        margin: 0,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };
      // @ts-ignore - lib non typée
      html2pdf().set(opt).from(container).toPdf().get('pdf').then((pdf: any) => {
        const blob: Blob = pdf.output('blob');
        document.body.removeChild(container);
        resolve(blob);
      }).catch((e: any) => {
        document.body.removeChild(container);
        reject(e);
      });
    } catch (e) {
      reject(e);
    }
  });
};

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

    // Appeler l'edge function (PDF natif)
    const { data, error } = await supabase.functions.invoke('render-offer-pdf', {
      body: { 
        offerId, 
        templateSlug 
      }
    });

    // Si l'edge renvoie une erreur (ex: Puppeteer bloqué), fallback en HTML côté client
    if (error) {
      console.warn('[PDF-SERVICE] Edge PDF failed, falling back to HTML render mode:', error);
      const { data: htmlData, error: htmlError } = await supabase.functions.invoke('render-offer-pdf', {
        body: { offerId, templateSlug, renderMode: 'html' }
      });
      if (htmlError || !htmlData) {
        console.error('[PDF-SERVICE] HTML fallback failed:', htmlError);
        throw (htmlError || new Error('No data from HTML fallback'));
      }
      const htmlString = typeof htmlData === 'string'
        ? htmlData
        : new TextDecoder().decode(htmlData as ArrayBuffer);
      return await htmlToPdfBlob(htmlString);
    }

    if (!data) {
      throw new Error('No data received from PDF generation function');
    }

    // Détection: si on a reçu du HTML directement (selon config), convertir côté client
    if (typeof data === 'string' && data.trim().startsWith('<!DOCTYPE')) {
      return await htmlToPdfBlob(data);
    }

    // La réponse est déjà un Blob si c'est un PDF
    if (data instanceof Blob) {
      return data;
    }
    
    // Si data est un ArrayBuffer, le convertir en Blob
    if (data instanceof ArrayBuffer) {
      return new Blob([data], { type: 'application/pdf' });
    }
    
    // Convertir en Uint8Array puis en Blob
    const uint8Array = new Uint8Array(data as ArrayBuffer);
    return new Blob([uint8Array], { type: 'application/pdf' });

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
