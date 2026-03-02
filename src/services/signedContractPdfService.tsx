import { supabase, getFileUploadClient, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';

// Re-export the type for backward compatibility
export type { SignedContractPDFData } from '@/components/pdf/templates/SignedContractPDFDocument';

/**
 * Generate PDF blob for a signed contract via edge function (avoids WASM/CSP issues)
 */
export async function generateSignedContractPDF(contractId: string): Promise<Blob> {
  console.log('[SIGNED-CONTRACT-PDF] Generating PDF via edge function for contract:', contractId);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Non authentifié. Veuillez vous reconnecter.');
  }

  const url = `${SUPABASE_URL}/functions/v1/generate-signed-contract-pdf`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ contractId, action: 'download' }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
    console.error('[SIGNED-CONTRACT-PDF] Edge function error:', errorData);
    throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
  }

  const blob = await response.blob();
  console.log(`[SIGNED-CONTRACT-PDF] Generated PDF (${blob.size} bytes)`);
  return blob;
}

/**
 * Upload signed contract PDF to Supabase Storage
 */
export async function uploadSignedContractPDF(contractId: string, blob: Blob): Promise<string> {
  console.log('[SIGNED-CONTRACT-PDF] Uploading PDF to storage for contract:', contractId);

  // Fetch tracking number for filename
  const { data: contract } = await supabase
    .from('contracts')
    .select('tracking_number')
    .eq('id', contractId)
    .single();

  const trackingNumber = contract?.tracking_number || contractId;
  const fileName = `${trackingNumber}-signed.pdf`;

  const fileClient = getFileUploadClient();

  // Force binary upload to avoid multipart/form-data artifacts in stored files
  const pdfArrayBuffer = await blob.arrayBuffer();
  const pdfBytes = new Uint8Array(pdfArrayBuffer);

  // Upload to signed-contracts bucket (use dedicated upload client to avoid global JSON headers)
  const { error: uploadError } = await fileClient.storage
    .from('signed-contracts')
    .upload(fileName, pdfBytes, {
      contentType: 'application/pdf',
      cacheControl: '0',
      upsert: true, // Overwrite if exists
    });

  if (uploadError) {
    console.error('[SIGNED-CONTRACT-PDF] Upload error:', uploadError);
    throw new Error(`Erreur upload: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = fileClient.storage
    .from('signed-contracts')
    .getPublicUrl(fileName);

  const publicUrl = urlData?.publicUrl;
  console.log('[SIGNED-CONTRACT-PDF] Uploaded to:', publicUrl);

  // Update contract with PDF URL
  const { error: updateError } = await supabase
    .from('contracts')
    .update({ signed_contract_pdf_url: publicUrl })
    .eq('id', contractId);

  if (updateError) {
    console.error('[SIGNED-CONTRACT-PDF] Error updating contract:', updateError);
  }

  return publicUrl;
}

/**
 * Generate and upload signed contract PDF in one call via edge function
 */
export async function generateAndUploadSignedContractPDF(contractId: string): Promise<string> {
  console.log('[SIGNED-CONTRACT-PDF] Generate + upload via edge function for:', contractId);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Non authentifié. Veuillez vous reconnecter.');
  }

  const url = `${SUPABASE_URL}/functions/v1/generate-signed-contract-pdf`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ contractId, action: 'upload' }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
    throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
  }

  const result = await response.json();
  return result.url;
}

/**
 * Download signed contract PDF
 */
export async function downloadSignedContractPDF(contractId: string): Promise<void> {
  try {
    // Fetch minimal contract info for filename
    const { data: contract } = await supabase
      .from('contracts')
      .select('tracking_number, client_name')
      .eq('id', contractId)
      .single();

    const blob = await generateSignedContractPDF(contractId);

    // Create filename
    const trackingNumber = contract?.tracking_number || contractId.slice(0, 8);
    const clientName = contract?.client_name || 'Client';
    const filename = `Contrat ${trackingNumber} - ${clientName}.pdf`
      .replace(/[/\\:*?"<>|]/g, '');

    // Download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('[SIGNED-CONTRACT-PDF] Downloaded:', filename);
  } catch (error) {
    console.error('[SIGNED-CONTRACT-PDF] Download error:', error);
    throw error;
  }
}
