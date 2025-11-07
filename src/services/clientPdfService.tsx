import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { OfferPDFDocument, OfferPDFData } from '@/components/pdf/templates/OfferPDFDocument';
import { OfferEquipment } from '@/types/offerEquipment';
import { getOfferById } from '@/services/offers/offerDetail';
import { getOfferEquipment } from '@/services/offers/offerEquipment';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch offer data from Supabase for PDF generation (uses existing services)
 */
async function fetchOfferData(offerId: string): Promise<OfferPDFData | null> {
  try {
    const offer = await getOfferById(offerId);
    if (!offer) return null;

    // Always fetch equipment using the shared service to ensure proper RLS and structure
    const equipmentData: OfferEquipment[] = await getOfferEquipment(offerId);

    const totalMonthlyPayment = equipmentData.reduce(
      (sum, item) => sum + (item.monthly_payment || 0) * (item.quantity || 1),
      0
    );

    const totalMargin = equipmentData.reduce((sum, item) => {
      const purchaseTotal = (item.purchase_price || 0) * (item.quantity || 1);
      const sellingTotal = (item.selling_price || 0) * (item.quantity || 1);
      return sum + (sellingTotal - purchaseTotal);
    }, 0);

    // Fetch company branding
    let companyBranding: any = null;
    
    if (offer.company_id) {
      console.log('[CLIENT-PDF] Fetching company branding for company_id:', offer.company_id);
      const { data: brandingData, error: brandingError } = await supabase
        .from('company_customizations')
        .select('settings')
        .eq('company_id', offer.company_id)
        .eq('category', 'branding')
        .single();
      
      if (!brandingError && brandingData?.settings) {
        companyBranding = brandingData.settings;
      }
    }
    
    // Fallback: try to get company info by slug from URL
    if (!companyBranding) {
      const pathParts = window.location.pathname.split('/');
      const companySlug = pathParts[1]; // e.g., /itakecare/admin/...
      
      if (companySlug) {
        console.log('[CLIENT-PDF] Fetching company info by slug:', companySlug);
        const { data: companyData, error: companyError } = await supabase
          .rpc('get_public_company_info', { company_slug: companySlug });
        
        if (!companyError && companyData) {
          companyBranding = {
            name: companyData.name,
            logo_url: companyData.logo_url,
            primary_color: companyData.primary_color,
            secondary_color: companyData.secondary_color,
            accent_color: companyData.accent_color,
          };
        }
      }
    }

    const data: OfferPDFData = {
      id: offer.id,
      offer_number: offer.offer_number || offer.id.slice(0, 8).toUpperCase(),
      offer_date: offer.created_at,
      client_name: offer.client_name || 'Client',
      client_address: offer.client_address || undefined,
      client_email: offer.client_email || undefined,
      client_phone: offer.client_phone || undefined,
      equipment: equipmentData,
      total_monthly_payment: totalMonthlyPayment,
      total_margin: totalMargin,
      conditions: offer.conditions || undefined,
      additional_info: offer.additional_info || undefined,
      company_name: companyBranding?.name || '',
      company_address: undefined,
      company_email: offer.company_email,
      company_phone: offer.company_phone,
      company_logo_url: companyBranding?.logo_url,
      brand_primary_color: companyBranding?.primary_color,
      brand_secondary_color: companyBranding?.secondary_color,
      brand_accent_color: companyBranding?.accent_color,
    };

    console.log('[CLIENT-PDF] PDF data prepared with branding:', {
      logo: !!data.company_logo_url,
      primary: data.brand_primary_color,
    });

    return data;
  } catch (e) {
    console.error('[CLIENT-PDF] fetchOfferData error:', e);
    return null;
  }
}

/**
 * Generate PDF blob for an offer
 */
export async function generateOfferPDF(
  offerId: string,
  pdfType: 'client' | 'internal'
): Promise<Blob> {
  console.log(`[CLIENT-PDF] Generating ${pdfType} PDF for offer ${offerId}`);

  // Fetch offer data
  const offerData = await fetchOfferData(offerId);
  if (!offerData) {
    throw new Error('Impossible de récupérer les données de l\'offre');
  }

  // For client PDFs, remove sensitive financial data
  if (pdfType === 'client') {
    offerData.equipment = offerData.equipment.map((item) => ({
      ...item,
      purchase_price: 0,
      margin: 0,
      selling_price: undefined,
    }));
    offerData.total_margin = undefined;
  }

  // Generate PDF
  const blob = await pdf(
    <OfferPDFDocument offer={offerData} pdfType={pdfType} />
  ).toBlob();

  console.log(`[CLIENT-PDF] Generated ${pdfType} PDF (${blob.size} bytes)`);
  return blob;
}

/**
 * Generate PDF blob with custom overrides (for preview editor)
 */
export async function generateOfferPDFWithOverrides(
  offerId: string,
  pdfType: 'client' | 'internal',
  overrides: Partial<OfferPDFData>
): Promise<Blob> {
  console.log(`[CLIENT-PDF] Generating ${pdfType} PDF with overrides for offer ${offerId}`);

  // Fetch base offer data
  const baseData = await fetchOfferData(offerId);
  if (!baseData) {
    throw new Error('Impossible de récupérer les données de l\'offre');
  }

  // Merge with overrides
  const mergedData: OfferPDFData = {
    ...baseData,
    ...overrides,
    conditions: overrides.conditions ?? baseData.conditions,
    additional_info: overrides.additional_info ?? baseData.additional_info,
  };

  // For client PDFs, remove sensitive financial data
  if (pdfType === 'client') {
    mergedData.equipment = mergedData.equipment.map((item) => ({
      ...item,
      purchase_price: 0,
      margin: 0,
      selling_price: undefined,
    }));
    mergedData.total_margin = undefined;
  }

  // Generate PDF
  const blob = await pdf(
    <OfferPDFDocument offer={mergedData} pdfType={pdfType} />
  ).toBlob();

  console.log(`[CLIENT-PDF] Generated ${pdfType} PDF with overrides (${blob.size} bytes)`);
  return blob;
}

/**
 * Download offer PDF directly
 */
export async function downloadOfferPDF(
  offerId: string,
  pdfType: 'client' | 'internal'
): Promise<void> {
  try {
    const blob = await generateOfferPDF(offerId, pdfType);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `offre_${pdfType}_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('[CLIENT-PDF] Download error:', error);
    throw error;
  }
}
