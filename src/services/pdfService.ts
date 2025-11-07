import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================================================
// Helper: Direct fetch to edge function (bypasses invoke() ambiguity)
// ============================================================================

async function fetchFunctionPdf(functionName: string, body: any): Promise<Blob> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  
  if (!accessToken) {
    throw new Error('Session invalide. Veuillez vous reconnecter.');
  }

  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  console.log(`[PDF-SERVICE] Direct fetch to ${url}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'apikey': SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Erreur HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      message = errorData?.error || message;
    } catch {
      // If can't parse JSON, keep HTTP status message
    }
    console.error(`[PDF-SERVICE] HTTP error:`, message);
    throw new Error(message);
  }

  const buffer = await response.arrayBuffer();
  const blob = new Blob([buffer], { type: 'application/pdf' });
  
  console.log(`[PDF-SERVICE] Received PDF blob, size: ${blob.size} bytes`);
  return blob;
}

// ============================================================================
// Helper: Invoke edge function with retries (using direct fetch)
// ============================================================================

async function invokeWithRetry(functionName: string, body: any, maxRetries = 3): Promise<Blob> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[PDF-SERVICE] Attempt ${attempt}/${maxRetries} for ${functionName}`);
      
      const blob = await fetchFunctionPdf(functionName, body);
      return blob;
      
    } catch (error) {
      lastError = error as Error;
      console.error(`[PDF-SERVICE] Attempt ${attempt} failed:`, lastError);
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = 1000 * Math.pow(2, attempt - 1);
        console.log(`[PDF-SERVICE] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Échec de la génération du PDF après plusieurs tentatives');
}

/**
 * Generates a CLIENT PDF for an offer (mensualités uniquement - pour les clients finaux)
 * @param offerId - The ID of the offer to generate a PDF for
 * @returns A Promise that resolves to a Blob containing the PDF data
 */
export async function generateClientOfferPdf(offerId: string): Promise<Blob> {
  console.log('[PDF-SERVICE] Generating CLIENT PDF for offer:', offerId);
  return invokeWithRetry('render-offer-pdf-v2', { 
    offerId, 
    pdfType: 'client' 
  });
}

/**
 * Generates an INTERNAL PDF for an offer (tous les détails financiers - pour les admins)
 * @param offerId - The ID of the offer to generate a PDF for
 * @returns A Promise that resolves to a Blob containing the PDF data
 */
export async function generateInternalOfferPdf(offerId: string): Promise<Blob> {
  console.log('[PDF-SERVICE] Generating INTERNAL PDF for offer:', offerId);
  return invokeWithRetry('render-offer-pdf-v2', { 
    offerId, 
    pdfType: 'internal' 
  });
}

/**
 * Downloads a CLIENT PDF for an offer (mensualités uniquement)
 * @param offerId - The ID of the offer
 * @param clientName - Optional client name for the filename
 */
export async function downloadClientOfferPdf(offerId: string, clientName?: string): Promise<void> {
  const toastId = toast.loading("Génération du PDF client en cours...");
  
  try {
    const pdfBlob = await generateClientOfferPdf(offerId);
    
    // Create filename
    const sanitizedName = clientName?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'client';
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `offre_${sanitizedName}_${timestamp}.pdf`;
    
    // Create download link
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success("PDF client téléchargé avec succès !", { id: toastId });
  } catch (error) {
    console.error('[PDF-SERVICE] Error downloading client PDF:', error);
    toast.error("Erreur lors de la génération du PDF client. Veuillez réessayer.", { id: toastId });
    throw error;
  }
}

/**
 * Downloads an INTERNAL PDF for an offer (tous les détails financiers)
 * @param offerId - The ID of the offer
 * @param clientName - Optional client name for the filename
 */
export async function downloadInternalOfferPdf(offerId: string, clientName?: string): Promise<void> {
  const toastId = toast.loading("Génération du PDF interne en cours...");
  
  try {
    const pdfBlob = await generateInternalOfferPdf(offerId);
    
    // Create filename
    const sanitizedName = clientName?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'client';
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `offre_${sanitizedName}_${timestamp}_INTERNE.pdf`;
    
    // Create download link
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success("PDF interne téléchargé avec succès !", { id: toastId });
  } catch (error) {
    console.error('[PDF-SERVICE] Error downloading internal PDF:', error);
    toast.error("Erreur lors de la génération du PDF interne. Veuillez réessayer.", { id: toastId });
    throw error;
  }
}

/**
 * Opens a CLIENT PDF preview in a new tab
 * @param offerId - The ID of the offer
 */
export async function previewClientOfferPdf(offerId: string): Promise<void> {
  const toastId = toast.loading("Préparation de l'aperçu du PDF client...");
  
  // Open tab immediately to avoid popup blockers
  const popup = window.open('', '_blank');
  
  if (!popup) {
    toast.error("Le navigateur a bloqué l'ouverture de la fenêtre. Veuillez autoriser les pop-ups.", { id: toastId });
    return;
  }
  
  // Show loading message in the new tab
  popup.document.write(`
    <html>
      <head>
        <title>Préparation du PDF…</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            padding: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
          }
          .loader {
            text-align: center;
          }
          .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="loader">
          <div class="spinner"></div>
          <p>Préparation du PDF client…</p>
        </div>
      </body>
    </html>
  `);
  
  try {
    const pdfBlob = await generateClientOfferPdf(offerId);
    
    // Validate PDF signature
    const head = await pdfBlob.slice(0, 5).arrayBuffer();
    const signature = new TextDecoder().decode(head);
    
    if (!signature.startsWith('%PDF-')) {
      throw new Error("Réponse inattendue du service PDF (signature PDF manquante)");
    }
    
    // Load PDF in the popup
    const url = window.URL.createObjectURL(pdfBlob);
    popup.location.href = url;
    
    toast.success("Aperçu du PDF client ouvert !", { id: toastId });
    
    // Cleanup after delay
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 30000);
  } catch (error) {
    popup.close();
    console.error('[PDF-SERVICE] Preview error:', error);
    toast.error("Erreur lors de la préparation de l'aperçu du PDF client.", { id: toastId });
    throw error;
  }
}

/**
 * Opens an INTERNAL PDF preview in a new tab
 * @param offerId - The ID of the offer
 */
export async function previewInternalOfferPdf(offerId: string): Promise<void> {
  const toastId = toast.loading("Préparation de l'aperçu du PDF interne...");
  
  // Open tab immediately to avoid popup blockers
  const popup = window.open('', '_blank');
  
  if (!popup) {
    toast.error("Le navigateur a bloqué l'ouverture de la fenêtre. Veuillez autoriser les pop-ups.", { id: toastId });
    return;
  }
  
  // Show loading message in the new tab
  popup.document.write(`
    <html>
      <head>
        <title>Préparation du PDF…</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            padding: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
          }
          .loader {
            text-align: center;
          }
          .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="loader">
          <div class="spinner"></div>
          <p>Préparation du PDF interne…</p>
        </div>
      </body>
    </html>
  `);
  
  try {
    const pdfBlob = await generateInternalOfferPdf(offerId);
    
    // Validate PDF signature
    const head = await pdfBlob.slice(0, 5).arrayBuffer();
    const signature = new TextDecoder().decode(head);
    
    if (!signature.startsWith('%PDF-')) {
      throw new Error("Réponse inattendue du service PDF (signature PDF manquante)");
    }
    
    // Load PDF in the popup
    const url = window.URL.createObjectURL(pdfBlob);
    popup.location.href = url;
    
    toast.success("Aperçu du PDF interne ouvert !", { id: toastId });
    
    // Cleanup after delay
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 30000);
  } catch (error) {
    popup.close();
    console.error('[PDF-SERVICE] Preview error:', error);
    toast.error("Erreur lors de la préparation de l'aperçu du PDF interne.", { id: toastId });
    throw error;
  }
}

/**
 * Generates a CLIENT PDF and returns it as a base64 string
 * Useful for embedding in emails or other data transfer scenarios
 * @param offerId - The ID of the offer
 * @returns A Promise that resolves to a base64 encoded string of the PDF
 */
export async function generateClientOfferPdfBase64(offerId: string): Promise<string> {
  try {
    const pdfBlob = await generateClientOfferPdf(offerId);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // Extract base64 part (remove data:application/pdf;base64, prefix)
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert PDF to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(pdfBlob);
    });
  } catch (error) {
    console.error('[PDF-SERVICE] Error generating client PDF base64:', error);
    throw error;
  }
}

/**
 * Generates an INTERNAL PDF and returns it as a base64 string
 * Useful for embedding in emails or other data transfer scenarios
 * @param offerId - The ID of the offer
 * @returns A Promise that resolves to a base64 encoded string of the PDF
 */
export async function generateInternalOfferPdfBase64(offerId: string): Promise<string> {
  try {
    const pdfBlob = await generateInternalOfferPdf(offerId);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // Extract base64 part (remove data:application/pdf;base64, prefix)
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert PDF to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(pdfBlob);
    });
  } catch (error) {
    console.error('[PDF-SERVICE] Error generating internal PDF base64:', error);
    throw error;
  }
}

// ============================================================================
// DEPRECATED METHODS (kept for backward compatibility)
// Use generateClientOfferPdf or generateInternalOfferPdf instead
// ============================================================================

/**
 * @deprecated Use generateClientOfferPdf or generateInternalOfferPdf instead
 */
export async function generateOfferPdf(offerId: string): Promise<Blob> {
  console.log('[PDF-SERVICE] [DEPRECATED] Use generateClientOfferPdf instead');
  return generateClientOfferPdf(offerId);
}

/**
 * @deprecated Use downloadClientOfferPdf or downloadInternalOfferPdf instead
 */
export async function downloadOfferPdf(offerId: string, clientName?: string): Promise<void> {
  console.log('[PDF-SERVICE] [DEPRECATED] Use downloadClientOfferPdf instead');
  return downloadClientOfferPdf(offerId, clientName);
}

/**
 * @deprecated Use previewClientOfferPdf or previewInternalOfferPdf instead
 */
export async function previewOfferPdf(offerId: string): Promise<void> {
  console.log('[PDF-SERVICE] [DEPRECATED] Use previewClientOfferPdf instead');
  return previewClientOfferPdf(offerId);
}

/**
 * @deprecated Use generateClientOfferPdfBase64 or generateInternalOfferPdfBase64 instead
 */
export async function generateOfferPdfBase64(offerId: string): Promise<string> {
  console.log('[PDF-SERVICE] [DEPRECATED] Use generateClientOfferPdfBase64 instead');
  return generateClientOfferPdfBase64(offerId);
}
