import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { OfferPDFDocument, OfferPDFData } from '@/components/pdf/templates/OfferPDFDocument';
import { OfferEquipment } from '@/types/offerEquipment';
import { getOfferById } from '@/services/offers/offerDetail';
import { getOfferEquipment } from '@/services/offers/offerEquipment';

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
      company_name: 'Votre Entreprise', // TODO: load from branding/settings
      company_address: undefined,
      company_email: 'contact@entreprise.fr',
      company_phone: undefined,
    };

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
