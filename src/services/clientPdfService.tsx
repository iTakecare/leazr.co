import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { OfferPDFDocument, OfferPDFData } from '@/components/pdf/templates/OfferPDFDocument';
import { OfferEquipment } from '@/types/offerEquipment';
import { getOfferById } from '@/services/offers/offerDetail';
import { getOfferEquipment } from '@/services/offers/offerEquipment';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch offer data from Supabase for PDF generation with proper SQL joins
 */
async function fetchOfferData(offerId: string): Promise<OfferPDFData | null> {
  try {
    // Fetch offer with all related data using SQL joins
    const { data: offerData, error: offerError } = await supabase
      .from('offers')
      .select(`
        *,
        clients!inner(
          phone,
          address,
          city,
          postal_code,
          country
        ),
        companies!inner(
          name,
          logo_url,
          primary_color,
          secondary_color,
          accent_color
        )
      `)
      .eq('id', offerId)
      .single();

    if (offerError || !offerData) {
      console.error('[CLIENT-PDF] Error fetching offer:', offerError);
      return null;
    }

    // Fetch company customizations for email/phone/address
    const { data: customizationData } = await supabase
      .from('company_customizations')
      .select('company_email, company_phone, company_address')
      .eq('company_id', offerData.company_id)
      .single();

    // Fetch equipment using the shared service to ensure proper RLS and structure
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

    // Build client address string
    const clientAddressParts = [
      offerData.clients?.address,
      offerData.clients?.postal_code && offerData.clients?.city 
        ? `${offerData.clients.postal_code} ${offerData.clients.city}`
        : offerData.clients?.city || offerData.clients?.postal_code,
      offerData.clients?.country,
    ].filter(Boolean);

    const data: OfferPDFData = {
      id: offerData.id,
      offer_number: offerData.offer_number || `OFF-${new Date().getFullYear()}-${offerData.id.slice(0, 8).toUpperCase()}`,
      offer_date: offerData.created_at,
      client_name: offerData.client_name || 'Client',
      client_address: clientAddressParts.length > 0 ? clientAddressParts.join(', ') : undefined,
      client_email: offerData.client_email || undefined,
      client_phone: offerData.clients?.phone || undefined,
      equipment: equipmentData,
      total_monthly_payment: totalMonthlyPayment,
      total_margin: totalMargin,
      conditions: offerData.conditions || undefined,
      additional_info: offerData.additional_info || undefined,
      company_name: offerData.companies?.name || '',
      company_address: customizationData?.company_address || undefined,
      company_email: customizationData?.company_email || undefined,
      company_phone: customizationData?.company_phone || undefined,
      company_logo_url: offerData.companies?.logo_url || undefined,
      brand_primary_color: offerData.companies?.primary_color || undefined,
      brand_secondary_color: offerData.companies?.secondary_color || undefined,
      brand_accent_color: offerData.companies?.accent_color || undefined,
    };

    console.log('[CLIENT-PDF] PDF data prepared with branding:', {
      offerNumber: data.offer_number,
      logo: !!data.company_logo_url,
      primaryColor: data.brand_primary_color,
      companyName: data.company_name,
      clientPhone: data.client_phone,
      clientAddress: data.client_address,
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
