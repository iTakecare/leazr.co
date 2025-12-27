import { SignedContractPDFData } from '@/components/pdf/templates/SignedContractPDFDocument';
import { getPDFContentBlocksByPage, DEFAULT_PDF_CONTENT_BLOCKS } from '@/services/pdfContentService';

/**
 * Build SignedContractPDFData from the get_contract_for_signature RPC response.
 * This helper is used by public pages to generate PDF without accessing protected tables.
 */
export const buildSignedContractPdfDataFromRpc = async (rpcData: any): Promise<SignedContractPDFData> => {
  // RPC returns flat structure - client, company, company_customization, leaser, equipment are nested objects
  const client = rpcData.client || {};
  const company = rpcData.company || {};
  const customization = rpcData.company_customization || {};
  const leaser = rpcData.leaser || null;
  const equipment = rpcData.equipment || [];

  // Leaser display name logic matching admin
  let leaserDisplayName = rpcData.leaser_name || 'Non spécifié';
  if (leaser) {
    leaserDisplayName = leaser.name || rpcData.leaser_name || 'Non spécifié';
  }

  // is_self_leasing from leaser object
  const isSelfLeasing = leaser?.is_own_company === true;

  // Fetch contract template content from pdf_content_blocks
  let contractContent: Record<string, string> = {};
  try {
    if (company.id) {
      contractContent = await getPDFContentBlocksByPage(company.id, 'contract');
    }
  } catch (e) {
    console.warn('[signedContractPdfPublicData] Failed to load contract template, using defaults');
    contractContent = DEFAULT_PDF_CONTENT_BLOCKS.contract;
  }
  if (Object.keys(contractContent).length === 0) {
    contractContent = DEFAULT_PDF_CONTENT_BLOCKS.contract;
  }

  // Build data matching admin exactly - use flat rpcData fields
  const pdfData: SignedContractPDFData = {
    id: rpcData.id,
    tracking_number: rpcData.tracking_number || `CON-${(rpcData.id || '').slice(0, 8)}`,
    created_at: rpcData.created_at,
    // Contract dates
    contract_start_date: rpcData.contract_start_date || undefined,
    contract_end_date: rpcData.contract_end_date || undefined,
    // Client - use data from nested client object
    client_name: client.name || 'Client',
    client_company: client.company || undefined,
    client_address: client.address || undefined,
    client_city: client.city || undefined,
    client_postal_code: client.postal_code || undefined,
    client_country: client.country || 'Belgique',
    client_vat_number: client.vat_number || undefined,
    client_phone: client.phone || undefined,
    client_email: client.email || undefined,
    client_iban: rpcData.client_iban || undefined,
    client_bic: rpcData.client_bic || undefined,
    // Leaser
    leaser_name: leaserDisplayName,
    is_self_leasing: isSelfLeasing,
    // Company from company_customizations matching admin flow
    company_name: customization.company_name || company.name || '',
    company_address: customization.company_address || undefined,
    company_email: customization.company_email || undefined,
    company_phone: customization.company_phone || undefined,
    company_vat_number: customization.company_vat_number || undefined,
    company_logo_url: customization.logo_url || company.logo_url || undefined,
    // Financial - use flat rpcData fields from RPC
    monthly_payment: rpcData.monthly_payment || 0,
    contract_duration: rpcData.contract_duration || 36,
    file_fee: rpcData.file_fee || 0,
    annual_insurance: rpcData.annual_insurance || 0,
    down_payment: rpcData.down_payment || 0,
    coefficient: rpcData.coefficient || 0,
    financed_amount: rpcData.financed_amount || 0,
    amount: rpcData.financed_amount || 0,
    // Equipment with complete details (margin now included from RPC)
    equipment: (equipment || []).map((eq: any) => ({
      title: eq.title,
      quantity: eq.quantity || 1,
      monthly_payment: eq.monthly_payment || 0,
      purchase_price: eq.purchase_price || 0,
      margin: eq.margin || 0,
      serial_number: eq.serial_number || undefined,
    })),
    // Signature - use flat rpcData fields
    signature_data: rpcData.contract_signature_data || undefined,
    signer_name: rpcData.contract_signer_name || client.name,
    signer_ip: rpcData.contract_signer_ip || undefined,
    signed_at: rpcData.contract_signed_at || undefined,
    // Contract template content
    contract_content: contractContent,
    // Brand
    primary_color: company.primary_color || '#33638e',
    // Remarks
    special_provisions: rpcData.remarks || undefined,
  };

  return pdfData;
};

/**
 * Generate a deterministic filename for a signed contract PDF
 */
export const getSignedContractPdfFilename = (trackingNumber: string, clientName: string): string => {
  const safeName = `Contrat ${trackingNumber} - ${clientName}.pdf`.replace(/[/\\:*?"<>|]/g, '');
  return safeName;
};

/**
 * Generate a deterministic storage path for a signed contract PDF
 */
export const getSignedContractStoragePath = (trackingNumber: string): string => {
  return `${trackingNumber}-signed.pdf`;
};
