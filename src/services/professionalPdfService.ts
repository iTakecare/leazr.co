import { supabase } from "@/integrations/supabase/client";
import html2pdf from "html2pdf.js";

export interface ProfessionalPdfOptions {
  filename?: string;
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
}

/**
 * Génère un PDF professionnel à partir d'une offre
 */
export async function generateProfessionalOfferPdf(
  offerId: string,
  options: ProfessionalPdfOptions = {}
): Promise<void> {
  try {
    console.log('[PROFESSIONAL PDF SERVICE] Starting PDF generation for offer:', offerId);

    // Appeler l'Edge Function pour obtenir le HTML
    const { data, error } = await supabase.functions.invoke('generate-professional-offer-pdf', {
      body: { offerId }
    });

    if (error) {
      console.error('[PROFESSIONAL PDF SERVICE] Edge function error:', error);
      throw new Error(`Erreur lors de la génération du PDF: ${error.message}`);
    }

    if (!data || !data.success || !data.html) {
      console.error('[PROFESSIONAL PDF SERVICE] Invalid response:', data);
      throw new Error('Réponse invalide du serveur');
    }

    console.log('[PROFESSIONAL PDF SERVICE] HTML received, converting to PDF...');

    // Créer un élément temporaire pour le HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = data.html;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    // Options de conversion PDF
    const pdfOptions = {
      margin: 0,
      filename: options.filename || `Offre_${offerId.slice(0, 8)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: options.format || 'a4', 
        orientation: options.orientation || 'portrait',
        compress: true
      }
    };

    // Générer et télécharger le PDF
    await html2pdf().set(pdfOptions).from(tempDiv).save();

    // Nettoyer
    document.body.removeChild(tempDiv);

    console.log('[PROFESSIONAL PDF SERVICE] PDF generated successfully');
  } catch (error) {
    console.error('[PROFESSIONAL PDF SERVICE] Error:', error);
    throw error;
  }
}

/**
 * Prévisualise le HTML sans générer le PDF
 */
export async function previewProfessionalOfferHtml(offerId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-professional-offer-pdf', {
    body: { offerId }
  });

  if (error || !data || !data.success) {
    throw new Error('Erreur lors de la prévisualisation');
  }

  return data.html;
}