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
          company,
          billing_address,
          billing_city,
          billing_postal_code,
          billing_country
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

    // Fetch company customizations for email/phone/address/vat
    const { data: customizationData } = await supabase
      .from('company_customizations')
      .select('company_email, company_phone, company_address, company_vat_number')
      .eq('company_id', offerData.company_id)
      .single();

    // Fetch company values
    const { data: valuesData } = await supabase
      .from('company_values')
      .select('title, description, icon_url')
      .eq('company_id', offerData.company_id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    // Fetch company metrics
    const { data: metricsData } = await supabase
      .from('company_metrics')
      .select('label, value, icon_name')
      .eq('company_id', offerData.company_id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    // Fetch partner logos
    const { data: logosData } = await supabase
      .from('company_partner_logos')
      .select('name, logo_url')
      .eq('company_id', offerData.company_id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    // Fetch equipment using the shared service to ensure proper RLS and structure
    const equipmentData: OfferEquipment[] = await getOfferEquipment(offerId);

    // monthly_payment en DB est DÉJÀ le total pour cet équipement (pas unitaire)
    const totalMonthlyPayment = equipmentData.reduce(
      (sum, item) => sum + (item.monthly_payment || 0),
      0
    );

    const totalMargin = equipmentData.reduce((sum, item) => {
      const purchaseTotal = (item.purchase_price || 0) * (item.quantity || 1);
      const sellingTotal = (item.selling_price || 0) * (item.quantity || 1);
      return sum + (sellingTotal - purchaseTotal);
    }, 0);

    // Calculate down payment and adjusted monthly payment
    const downPayment = offerData.down_payment || 0;
    const coefficient = offerData.coefficient || 0;

    // Calculate total selling price for financed amount calculation
    const totalSellingPrice = equipmentData.reduce(
      (sum, item) => sum + ((item.selling_price || 0) * (item.quantity || 1)),
      0
    );

    // Calculate financed amount (base amount before down payment)
    // Priorité 1: Formule Grenke (source de vérité)
    const baseFinancedAmount = (coefficient > 0 && totalMonthlyPayment > 0)
      ? (totalMonthlyPayment * 100) / coefficient
      : totalSellingPrice > 0 
        ? totalSellingPrice 
        : (offerData.financed_amount || offerData.amount || 0);

    // Calculate financed amount after down payment
    const financedAmountAfterDownPayment = Math.max(0, baseFinancedAmount - downPayment);

    // Calculate adjusted monthly payment if there's a down payment
    const adjustedMonthlyPayment = downPayment > 0 && coefficient > 0
      ? Math.round((financedAmountAfterDownPayment * coefficient) / 100 * 100) / 100
      : totalMonthlyPayment;

    // Build client address string
    const clientAddressParts = [
      offerData.clients?.billing_address,
      offerData.clients?.billing_postal_code && offerData.clients?.billing_city 
        ? `${offerData.clients.billing_postal_code} ${offerData.clients.billing_city}`
        : offerData.clients?.billing_city || offerData.clients?.billing_postal_code,
      offerData.clients?.billing_country,
    ].filter(Boolean);

    // Fetch PDF content blocks
    const { data: contentBlocksData } = await supabase
      .from('pdf_content_blocks')
      .select('page_name, block_key, content')
      .eq('company_id', offerData.company_id);

    // Convert to object map
    const contentBlocks: Record<string, string> = {};
    if (contentBlocksData) {
      contentBlocksData.forEach(block => {
        contentBlocks[`${block.page_name}_${block.block_key}`] = block.content;
      });
    }

    // Calculate total selling price for purchase offers
    // Note: selling_price is the UNIT price, so we multiply by quantity
    const totalSellingPriceFromEquipment = equipmentData.reduce(
      (sum, item) => sum + ((item.selling_price || 0) * (item.quantity || 1)),
      0
    );

    const data: OfferPDFData = {
      id: offerData.id,
      offer_number: offerData.offer_number || `OFF-${new Date().getFullYear()}-${offerData.id.slice(0, 8).toUpperCase()}`,
      offer_date: offerData.created_at,
      client_name: offerData.client_name || 'Client',
      client_company: offerData.clients?.company || undefined,
      client_address: clientAddressParts.length > 0 ? clientAddressParts.join(', ') : undefined,
      client_email: offerData.client_email || undefined,
      client_phone: offerData.clients?.phone || undefined,
      equipment: equipmentData,
      total_monthly_payment: totalMonthlyPayment,
      total_margin: totalMargin,
      conditions: offerData.conditions ? [offerData.conditions] : undefined,
      additional_info: offerData.additional_info || undefined,
      company_name: offerData.companies?.name || '',
      company_address: customizationData?.company_address || undefined,
      company_email: customizationData?.company_email || undefined,
      company_phone: customizationData?.company_phone || undefined,
      company_vat_number: customizationData?.company_vat_number || undefined,
      company_logo_url: offerData.companies?.logo_url || undefined,
      brand_primary_color: offerData.companies?.primary_color || undefined,
      brand_secondary_color: offerData.companies?.secondary_color || undefined,
      brand_accent_color: offerData.companies?.accent_color || undefined,
      // Values page data
      values: valuesData || [],
      metrics: metricsData || [],
      partner_logos: logosData || [],
      // Financial fields
      file_fee: offerData.file_fee || 0,
      annual_insurance: offerData.annual_insurance || 0,
      contract_duration: offerData.contract_duration || 36,
      contract_terms: offerData.contract_terms || 'Livraison incluse - Maintenance incluse - Garantie en échange direct incluse',
      down_payment: downPayment,
      coefficient: coefficient,
      adjusted_monthly_payment: adjustedMonthlyPayment,
      financed_amount_after_down_payment: financedAmountAfterDownPayment,
      // Purchase mode fields
      is_purchase: offerData.is_purchase || false,
      total_selling_price: offerData.is_purchase 
        ? (offerData.financed_amount || totalSellingPriceFromEquipment)
        : totalSellingPriceFromEquipment,
      // Content blocks
      content_blocks: {
        cover_greeting: contentBlocks.cover_greeting,
        cover_introduction: contentBlocks.cover_introduction,
        cover_validity: contentBlocks.cover_validity,
        equipment_title: contentBlocks.equipment_title,
        equipment_footer_note: contentBlocks.equipment_footer_note,
        conditions_general_conditions: contentBlocks.conditions_general_conditions,
        conditions_additional_info: contentBlocks.conditions_additional_info,
        conditions_contact_info: contentBlocks.conditions_contact_info,
      },
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
  // But for purchase offers, keep selling_price as it's the client-facing price
  if (pdfType === 'client') {
    const isPurchase = offerData.is_purchase;
    offerData.equipment = offerData.equipment.map((item) => ({
      ...item,
      purchase_price: 0,
      margin: 0,
      // Keep selling_price for purchase offers (it's the public price)
      selling_price: isPurchase ? item.selling_price : undefined,
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
  // But for purchase offers, keep selling_price as it's the client-facing price
  if (pdfType === 'client') {
    const isPurchase = mergedData.is_purchase;
    mergedData.equipment = mergedData.equipment.map((item) => ({
      ...item,
      purchase_price: 0,
      margin: 0,
      // Keep selling_price for purchase offers (it's the public price)
      selling_price: isPurchase ? item.selling_price : undefined,
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
    // Fetch offer data first to get client info for filename
    const offerData = await fetchOfferData(offerId);
    if (!offerData) {
      throw new Error('Impossible de récupérer les données de l\'offre');
    }

    // Generate PDF blob
    const blob = await generateOfferPDF(offerId, pdfType);
    
    // Format date in French
    const date = new Date(offerData.offer_date);
    const formattedDate = date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Build filename dynamically
    const filenameParts = [
      `Offre ${offerData.company_name || 'iTakecare'}`,
      offerData.client_name,
      offerData.client_company,
      formattedDate
    ].filter(Boolean); // Remove empty values

    // Clean filename (remove invalid characters for file systems)
    let filename = filenameParts.join(' - ');
    filename = filename.replace(/[/\\:*?"<>|]/g, ''); // Remove invalid chars
    filename = `${filename}.pdf`;

    // Download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('[CLIENT-PDF] Download error:', error);
    throw error;
  }
}
