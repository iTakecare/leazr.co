import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { supabase } from '@/integrations/supabase/client';
import { OfferPDFDocument, OfferPDFData } from '@/components/pdf/templates/OfferPDFDocument';
import { OfferEquipment } from '@/types/offerEquipment';

/**
 * Fetch offer data from Supabase for PDF generation
 */
async function fetchOfferData(offerId: string): Promise<OfferPDFData | null> {
  const { data: offer, error } = await supabase
    .from('offers')
    .select(`
      *,
      clients!inner(
        company_name,
        address,
        email,
        phone
      )
    `)
    .eq('id', offerId)
    .single();

  if (error || !offer) {
    console.error('[CLIENT-PDF] Error fetching offer:', error);
    return null;
  }

  // Fetch equipment
  const { data: equipment, error: equipmentError } = await supabase
    .from('offer_equipment')
    .select(`
      *,
      offer_equipment_attributes(*),
      offer_equipment_specifications(*)
    `)
    .eq('offer_id', offerId)
    .order('created_at', { ascending: true });

  if (equipmentError) {
    console.error('[CLIENT-PDF] Error fetching equipment:', equipmentError);
  }

  const equipmentList: OfferEquipment[] = (equipment || []).map((item: any) => ({
    id: item.id,
    offer_id: item.offer_id,
    title: item.title,
    purchase_price: item.purchase_price,
    quantity: item.quantity,
    margin: item.margin,
    monthly_payment: item.monthly_payment,
    selling_price: item.selling_price,
    coefficient: item.coefficient,
    serial_number: item.serial_number,
    attributes: item.offer_equipment_attributes || [],
    specifications: item.offer_equipment_specifications || [],
  }));

  const totalMonthlyPayment = equipmentList.reduce(
    (sum, item) => sum + (item.monthly_payment || 0) * item.quantity,
    0
  );

  const totalMargin = equipmentList.reduce((sum, item) => {
    const purchaseTotal = item.purchase_price * item.quantity;
    const sellingTotal = (item.selling_price || 0) * item.quantity;
    return sum + (sellingTotal - purchaseTotal);
  }, 0);

  return {
    id: offer.id,
    offer_number: offer.offer_number || offer.id.slice(0, 8).toUpperCase(),
    offer_date: offer.created_at,
    client_name: offer.clients?.company_name || 'Client',
    client_address: offer.clients?.address,
    client_email: offer.clients?.email,
    client_phone: offer.clients?.phone,
    equipment: equipmentList,
    total_monthly_payment: totalMonthlyPayment,
    total_margin: totalMargin,
    conditions: offer.conditions || undefined,
    additional_info: offer.additional_info,
    company_name: 'Votre Entreprise', // TODO: Get from settings/config
    company_address: undefined, // TODO: Get from settings/config
    company_email: 'contact@entreprise.fr', // TODO: Get from settings/config
    company_phone: undefined, // TODO: Get from settings/config
  };
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
