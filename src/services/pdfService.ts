import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// Fallback client-side PDF generation
// @ts-ignore
import html2pdf from "html2pdf.js";

// Fallback: transforme du HTML (renvoyé par l’edge) en PDF côté client
const htmlToPdfBlob = async (html: string): Promise<Blob> => {
  return new Promise(async (resolve, reject) => {
    let container: HTMLDivElement | null = null;
    try {
      // Create offscreen container sized to A4 width at ~96dpi
      container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-100000px';
      container.style.top = '0';
      container.style.width = '794px'; // A4 width @96dpi
      container.style.background = '#ffffff';
      container.style.fontFamily = 'Arial, sans-serif';
      container.style.color = '#000';

      // Parse the incoming HTML and inject only head styles + body content
      const parsed = new DOMParser().parseFromString(html, 'text/html');

      // Copy inline <style> tags from <head> so CSS applies inside container
      parsed.head?.querySelectorAll('style')?.forEach((styleEl) => {
        const s = document.createElement('style');
        s.textContent = styleEl.textContent || '';
        container!.appendChild(s);
      });

      // Inject the BODY children (avoid nesting a full HTML document inside a div)
      Array.from(parsed.body?.children || []).forEach((child) => {
        container!.appendChild(child.cloneNode(true));
      });

      document.body.appendChild(container);

      // Ensure images are loaded and CORS-safe before rasterization
      const images = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
      await Promise.all(
        images.map((img) =>
          new Promise<void>((res) => {
            try {
              img.crossOrigin = 'anonymous';
              // Helps some CDNs with html2canvas
              (img as any).referrerPolicy = 'no-referrer';
            } catch (_) {}
            if (img.complete) return res();
            img.onload = () => res();
            img.onerror = () => res();
          })
        )
      );

      const opt: any = {
        margin: 0,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      };

      // @ts-ignore - lib non typée
      html2pdf()
        .set(opt)
        .from(container)
        .toPdf()
        .get('pdf')
        .then((pdf: any) => {
          const blob: Blob = pdf.output('blob');
          if (container && container.parentNode) container.parentNode.removeChild(container);
          resolve(blob);
        })
        .catch((e: any) => {
          if (container && container.parentNode) container.parentNode.removeChild(container);
          reject(e);
        });
    } catch (e) {
      if (container && container.parentNode) container.parentNode.removeChild(container);
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

    // Toujours demander le HTML côté edge pour éviter Puppeteer (bloqué sur Deno runtime)
    const { data, error } = await supabase.functions.invoke('render-offer-pdf', {
      body: {
        offerId,
        templateSlug,
        renderMode: 'html',
      },
    });

    if (error || !data) {
      console.error('[PDF-SERVICE] HTML render error from edge function:', error);
      throw (error || new Error('No data received from HTML render function'));
    }

    // Convertir la réponse en string HTML
    const htmlString = typeof data === 'string'
      ? data
      : new TextDecoder().decode(data as ArrayBuffer);

    // Générer le PDF côté client depuis l'HTML reçu
    return await htmlToPdfBlob(htmlString);

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
