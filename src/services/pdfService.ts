import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Generate a PDF for an offer using the Supabase Edge Function
 */
export async function generateOfferPdf(offerId: string): Promise<Blob> {
  console.log('[PDF-SERVICE] Generating PDF for offer:', offerId);
  
  try {
    const { data, error } = await supabase.functions.invoke('render-offer-pdf', {
      body: { offerId },
      responseType: 'blob' as any,
    });

    if (error) {
      console.error('[PDF-SERVICE] Error invoking function:', error);
      throw new Error(error.message || 'Failed to generate PDF');
    }

    if (!data || !(data instanceof Blob)) {
      throw new Error('Invalid PDF response');
    }

    console.log('[PDF-SERVICE] PDF generated successfully:', data.size, 'bytes');
    return data;
  } catch (error) {
    console.error('[PDF-SERVICE] Error generating PDF:', error);
    toast.error('Erreur lors de la génération du PDF');
    throw error;
  }
}

/**
 * Download a PDF for an offer with a formatted filename
 */
export async function downloadOfferPdf(offerId: string, clientName?: string): Promise<void> {
  console.log('[PDF-SERVICE] Downloading PDF for offer:', offerId);
  
  try {
    toast.loading('Génération du PDF en cours...');
    
    const pdfBlob = await generateOfferPdf(offerId);
    
    // Create filename: Offre_ClientName_YYYYMMDD.pdf
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const safeName = clientName 
      ? clientName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
      : 'Client';
    const filename = `Offre_${safeName}_${today}.pdf`;
    
    // Create download link
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }, 100);
    
    toast.dismiss();
    toast.success('PDF téléchargé avec succès');
    
    console.log('[PDF-SERVICE] PDF downloaded:', filename);
  } catch (error) {
    toast.dismiss();
    console.error('[PDF-SERVICE] Error downloading PDF:', error);
    toast.error('Erreur lors du téléchargement du PDF');
    throw error;
  }
}

/**
 * Preview a PDF in a new browser tab
 */
export async function previewOfferPdf(offerId: string): Promise<void> {
  console.log('[PDF-SERVICE] Previewing PDF for offer:', offerId);
  
  try {
    toast.loading('Génération de l\'aperçu...');
    
    const pdfBlob = await generateOfferPdf(offerId);
    
    // Create blob URL and open in new tab
    const url = URL.createObjectURL(pdfBlob);
    const newWindow = window.open(url, '_blank');
    
    if (!newWindow) {
      toast.dismiss();
      toast.error('Veuillez autoriser les pop-ups pour prévisualiser le PDF');
      return;
    }
    
    // Cleanup after some time
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000); // Clean up after 1 minute
    
    toast.dismiss();
    toast.success('Aperçu ouvert dans un nouvel onglet');
    
    console.log('[PDF-SERVICE] PDF preview opened');
  } catch (error) {
    toast.dismiss();
    console.error('[PDF-SERVICE] Error previewing PDF:', error);
    toast.error('Erreur lors de l\'aperçu du PDF');
    throw error;
  }
}

/**
 * Generate PDF as base64 string (useful for email attachments)
 */
export async function generateOfferPdfBase64(offerId: string): Promise<string> {
  console.log('[PDF-SERVICE] Generating PDF as base64 for offer:', offerId);
  
  try {
    const pdfBlob = await generateOfferPdf(offerId);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(pdfBlob);
    });
  } catch (error) {
    console.error('[PDF-SERVICE] Error generating base64 PDF:', error);
    throw error;
  }
}
