import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { SignedContractPDFDocument, SignedContractPDFData } from '@/components/pdf/templates/SignedContractPDFDocument';
import { supabase } from '@/integrations/supabase/client';
import { getPDFContentBlocksByPage, DEFAULT_PDF_CONTENT_BLOCKS } from './pdfContentService';

/**
 * Fetch contract data from Supabase for PDF generation
 */
export async function fetchContractDataForPDF(contractId: string): Promise<SignedContractPDFData | null> {
  try {
    console.log('[SIGNED-CONTRACT-PDF] Fetching contract data for:', contractId);

    // Fetch contract with related data including client details and offer fees
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        *,
        companies!inner(
          name,
          logo_url,
          primary_color
        ),
        clients(
          company,
          address,
          city,
          postal_code,
          country,
          vat_number,
          phone,
          email
        ),
        offers(
          file_fee,
          annual_insurance
        )
      `)
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      console.error('[SIGNED-CONTRACT-PDF] Error fetching contract:', contractError);
      return null;
    }

    // Fetch company customizations
    const { data: customization } = await supabase
      .from('company_customizations')
      .select('company_email, company_phone, company_address, company_vat_number')
      .eq('company_id', contract.company_id)
      .single();

    // Fetch equipment with complete details
    const { data: equipment } = await supabase
      .from('contract_equipment')
      .select('id, title, quantity, monthly_payment, purchase_price, margin, serial_number')
      .eq('contract_id', contractId);

    // Try to get leaser company name
    let leaserDisplayName = contract.leaser_name || 'Non spécifié';
    if (contract.leaser_id) {
      const { data: leaser } = await supabase
        .from('leasers')
        .select('name, company_name, is_own_company')
        .eq('id', contract.leaser_id)
        .single();
      
      if (leaser) {
        leaserDisplayName = leaser.company_name || leaser.name;
        if (leaser.is_own_company) {
          contract.is_self_leasing = true;
        }
      }
    }

    // Fetch contract template content from pdf_content_blocks
    let contractContent: Record<string, string> = {};
    try {
      contractContent = await getPDFContentBlocksByPage(contract.company_id, 'contract');
      console.log('[SIGNED-CONTRACT-PDF] Contract template blocks loaded:', Object.keys(contractContent).length);
    } catch (e) {
      console.warn('[SIGNED-CONTRACT-PDF] Failed to load contract template, using defaults');
      contractContent = DEFAULT_PDF_CONTENT_BLOCKS.contract;
    }

    // If no template blocks found, use defaults
    if (Object.keys(contractContent).length === 0) {
      console.log('[SIGNED-CONTRACT-PDF] No contract template found, using defaults');
      contractContent = DEFAULT_PDF_CONTENT_BLOCKS.contract;
    }

    const pdfData: SignedContractPDFData = {
      id: contract.id,
      tracking_number: contract.tracking_number || `CTR-${contract.id.slice(0, 8).toUpperCase()}`,
      created_at: contract.created_at,
      // Contract dates
      contract_start_date: contract.contract_start_date || undefined,
      contract_end_date: contract.contract_end_date || undefined,
      // Client - use data from clients table via relationship
      client_name: contract.client_name || 'Client',
      client_company: (contract.clients as any)?.company || undefined,
      client_address: (contract.clients as any)?.address || undefined,
      client_city: (contract.clients as any)?.city || undefined,
      client_postal_code: (contract.clients as any)?.postal_code || undefined,
      client_country: (contract.clients as any)?.country || 'Belgique',
      client_vat_number: (contract.clients as any)?.vat_number || undefined,
      client_phone: (contract.clients as any)?.phone || undefined,
      client_email: contract.client_email || (contract.clients as any)?.email || undefined,
      client_iban: contract.client_iban || undefined,
      client_bic: contract.client_bic || undefined,
      // Leaser
      leaser_name: leaserDisplayName,
      is_self_leasing: contract.is_self_leasing || false,
      // Company
      company_name: contract.companies?.name || '',
      company_address: customization?.company_address || undefined,
      company_email: customization?.company_email || undefined,
      company_phone: customization?.company_phone || undefined,
      company_vat_number: customization?.company_vat_number || undefined,
      company_logo_url: contract.companies?.logo_url || undefined,
      // Financial
      monthly_payment: contract.monthly_payment || 0,
      contract_duration: contract.contract_duration || 36,
      file_fee: (contract.offers as any)?.file_fee || contract.file_fee || 0,
      annual_insurance: (contract.offers as any)?.annual_insurance || 0,
      // Equipment with complete details
      equipment: equipment?.map(eq => ({
        title: eq.title,
        quantity: eq.quantity || 1,
        monthly_payment: eq.monthly_payment || 0,
        purchase_price: eq.purchase_price || 0,
        margin: eq.margin || 0,
        serial_number: eq.serial_number || undefined,
      })) || [],
      // Signature - use correct column names from contracts table
      signature_data: contract.contract_signature_data || contract.signature_data || undefined,
      signer_name: contract.contract_signer_name || contract.signer_name || contract.client_name,
      signer_ip: contract.contract_signer_ip || contract.signer_ip || undefined,
      signed_at: contract.contract_signed_at || contract.signed_at || undefined,
      // Contract template content
      contract_content: contractContent,
      // Brand
      primary_color: contract.companies?.primary_color || '#33638e',
    };

    console.log('[SIGNED-CONTRACT-PDF] PDF data prepared:', {
      trackingNumber: pdfData.tracking_number,
      clientName: pdfData.client_name,
      equipmentCount: pdfData.equipment.length,
      hasSig: !!pdfData.signature_data,
      templateBlocks: Object.keys(contractContent).length,
    });

    return pdfData;
  } catch (e) {
    console.error('[SIGNED-CONTRACT-PDF] fetchContractDataForPDF error:', e);
    return null;
  }
}

/**
 * Generate PDF blob for a signed contract
 */
export async function generateSignedContractPDF(contractId: string): Promise<Blob> {
  console.log('[SIGNED-CONTRACT-PDF] Generating PDF for contract:', contractId);

  const contractData = await fetchContractDataForPDF(contractId);
  if (!contractData) {
    throw new Error('Impossible de récupérer les données du contrat');
  }

  const blob = await pdf(
    <SignedContractPDFDocument contract={contractData} />
  ).toBlob();

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

  // Upload to signed-contracts bucket
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('signed-contracts')
    .upload(fileName, blob, {
      contentType: 'application/pdf',
      upsert: true, // Overwrite if exists
    });

  if (uploadError) {
    console.error('[SIGNED-CONTRACT-PDF] Upload error:', uploadError);
    throw new Error(`Erreur upload: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
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
 * Generate and upload signed contract PDF in one call
 */
export async function generateAndUploadSignedContractPDF(contractId: string): Promise<string> {
  const blob = await generateSignedContractPDF(contractId);
  const url = await uploadSignedContractPDF(contractId, blob);
  return url;
}

/**
 * Download signed contract PDF
 */
export async function downloadSignedContractPDF(contractId: string): Promise<void> {
  try {
    const contractData = await fetchContractDataForPDF(contractId);
    if (!contractData) {
      throw new Error('Impossible de récupérer les données du contrat');
    }

    const blob = await generateSignedContractPDF(contractId);

    // Create filename
    const filename = `Contrat ${contractData.tracking_number} - ${contractData.client_name}.pdf`
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
