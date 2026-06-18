import React from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '@/integrations/supabase/client';
import CommercialOffer from '@/components/offers/CommercialOffer';
import { fetchOfferCompanyBranding } from '@/services/offers/offerCompanyBranding';

/**
 * Service unifié pour générer des PDF d'offres commerciales
 * Utilise CommercialOffer + html2canvas + jsPDF pour garantir un rendu identique
 * à l'affichage écran et à l'envoi par email
 */

interface CommercialOfferData {
  offerNumber: string;
  offerDate: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientCompany: string;
  clientAddress: string;
  companyLogo: string | null;
  companyName: string;
  companyAddress?: string;
  companyCity?: string;
  companyPostalCode?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyVatNumber?: string;
  showPrintButton: boolean;
  isPDFMode: boolean;
  isPurchase: boolean;
  equipment: Array<{
    id: string;
    title: string;
    quantity: number;
    monthlyPayment: number;
    sellingPrice: number;
    imageUrl: string | null;
    attributes: Record<string, string>;
    specifications: Record<string, string>;
  }>;
  externalServices?: Array<{
    providerName: string;
    productName: string;
    description?: string;
    tagline?: string;
    spec?: string;
    footnote?: string;
    priceHtva: number;
    billingPeriod: string;
    quantity: number;
  }>;
  promoProducts?: Array<{
    providerName: string;
    providerLogoUrl?: string | null;
    productName: string;
    description?: string;
    tagline?: string;
    spec?: string;
    footnote?: string;
    priceHtva: number;
    billingPeriod: string;
    quantity: number;
  }>;
  totalMonthly: number;
  totalSellingPrice: number;
  contractDuration: number;
  fileFee: number;
  insuranceCost: number;
  downPayment?: number;
  adjustedMonthlyPayment?: number;
  financedAmountAfterDownPayment?: number;
  discountAmount?: number;
  discountType?: 'percentage' | 'amount';
  discountValue?: number;
  monthlyPaymentBeforeDiscount?: number;
  partnerLogos: string[];
  companyValues: Array<{
    title: string;
    description: string;
    iconUrl?: string;
  }>;
  metrics: Array<{
    label: string;
    value: string;
    iconName?: string;
  }>;
  contentBlocks: {
    cover: {
      greeting: string;
      introduction: string;
      validity: string;
    };
    equipment: {
      title: string;
      footer_note: string;
    };
    conditions: {
      general_conditions: string;
      sale_general_conditions: string;
      additional_info: string;
      contact_info: string;
    };
  };
}

/**
 * Récupère toutes les données nécessaires pour générer le PDF d'une offre
 */
async function fetchOfferDataForCommercialOffer(offerId: string): Promise<CommercialOfferData | null> {
  try {
    // Récupérer les données de l'offre
    const { data: offerData, error: offerError } = await supabase
      .from('offers')
      .select(`
        *,
        clients (
          id,
          first_name,
          contact_name,
          email,
          phone,
          billing_address,
          billing_city,
          billing_postal_code,
          billing_country
        ),
        companies (
          id,
          name,
          logo_url,
          primary_color,
          secondary_color
        )
      `)
      .eq('id', offerId)
      .single();

    if (offerError || !offerData) {
      console.error('[COMMERCIAL-OFFER-PDF] Error fetching offer:', offerError);
      return null;
    }

    // Récupérer les équipements
    const { getOfferEquipment } = await import('@/services/offers/offerEquipment');
    const equipmentData = await getOfferEquipment(offerId);

    // Services prestataires externes (facturés directement, NON inclus dans le total)
    const { data: externalServicesData } = await supabase
      .from('offer_external_services' as any)
      .select('*')
      .eq('offer_id', offerId)
      .order('created_at', { ascending: true });

    // Produits promo (carte "Avez-vous pensé à...?", NON inclus dans le total)
    const { data: promoData } = await supabase
      .from('offer_promo_products' as any)
      .select('*')
      .eq('offer_id', offerId)
      .order('position', { ascending: true });

    // Le backfill des champs marketing depuis le catalogue est centralisé dans
    // enrichExternalServicesWithLogos (utilisé aussi par AdminOfferDetail).
    const { enrichExternalServicesWithLogos } = await import('@/services/offers/enrichExternalServicesWithLogos');
    const enrichedExternalServices = await enrichExternalServicesWithLogos(
      externalServicesData as any,
      offerData.company_id
    );

    const enrichedPromoProducts = await enrichExternalServicesWithLogos(
      promoData as any,
      offerData.company_id
    );

    // monthly_payment en DB est DÉJÀ le total pour cet équipement (pas unitaire)
    const computedTotalMonthly = equipmentData.reduce(
      (sum, eq) => sum + (Number(eq.monthly_payment) || 0),
      0
    );

    // Calculer le total prix de vente pour le mode achat
    // selling_price est le prix unitaire - multiplier par quantity
    const totalSellingPrice = equipmentData.reduce(
      (sum, eq) => {
        const sellingPrice = Number((eq as any).selling_price) || 0;
        const quantity = Number(eq.quantity) || 1;
        return sum + (sellingPrice * quantity);
      },
      0
    );

    // Convertir le logo en Base64
    let companyLogoBase64: string | null = null;
    if (offerData.companies?.logo_url) {
      try {
        const response = await fetch(offerData.companies.logo_url);
        const blob = await response.blob();
        companyLogoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.warn('[COMMERCIAL-OFFER-PDF] Error loading logo:', error);
      }
    }

    // Récupérer les logos partenaires
    const { data: partnerLogosData } = await supabase
      .from('company_partner_logos')
      .select('logo_url')
      .eq('company_id', offerData.companies.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    // Récupérer les valeurs de l'entreprise
    const { data: companyValuesData } = await supabase
      .from('company_values')
      .select('title, description, icon_url')
      .eq('company_id', offerData.companies.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(3);

    // Récupérer les métriques
    const { data: companyMetricsData } = await supabase
      .from('company_metrics')
      .select('label, value, icon_name')
      .eq('company_id', offerData.companies.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(3);

    // Récupérer les blocs de contenu texte
    const { data: contentBlocksData } = await supabase
      .from('pdf_content_blocks')
      .select('page_name, block_key, content')
      .eq('company_id', offerData.companies.id);

    const contentBlocksMap: Record<string, Record<string, string>> = {};
    contentBlocksData?.forEach(block => {
      if (!contentBlocksMap[block.page_name]) {
        contentBlocksMap[block.page_name] = {};
      }
      contentBlocksMap[block.page_name][block.block_key] = block.content;
    });

    // Formater l'adresse de facturation
    const billingAddress = offerData.clients ? 
      [
        offerData.clients.billing_address,
        offerData.clients.billing_postal_code,
        offerData.clients.billing_city,
        offerData.clients.billing_country
      ].filter(Boolean).join(', ') 
      : '';

    const isPurchase = (offerData as any)?.is_purchase === true;

    // Branding white-label via le helper partagé (même source que la page offre).
    const companyBranding = await fetchOfferCompanyBranding(offerData.company_id);

    // totalSellingPrice canonique (priorité financed_amount en mode achat)
    const totalSellingPriceCanonical = isPurchase && offerData.financed_amount
      ? Number(offerData.financed_amount)
      : totalSellingPrice;

    // Acompte et mensualité ajustée (formule canonique alignée sur la page offre)
    const downPayment = Number(offerData.down_payment) || 0;
    const coefficient = Number(offerData.coefficient) || 0;
    const baseFinancedAmount = totalSellingPriceCanonical > 0
      ? totalSellingPriceCanonical
      : (coefficient > 0 && (Number(offerData.monthly_payment) || 0) > 0
          ? ((Number(offerData.monthly_payment) || 0) * 100) / coefficient
          : Number(offerData.financed_amount) || Number(offerData.amount) || 0);
    const financedAmountAfterDownPayment = Math.max(0, baseFinancedAmount - downPayment);
    const adjustedMonthlyPayment = downPayment > 0 && coefficient > 0
      ? Math.round((financedAmountAfterDownPayment * coefficient) / 100 * 100) / 100
      : (Number(offerData.monthly_payment) || 0);

    return {
      offerNumber: offerData.dossier_number || `OFF-${Date.now().toString().slice(-6)}`,
      offerDate: offerData.created_at ? new Date(offerData.created_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR'),
      clientName: offerData.client_name || 'Client',
      clientEmail: offerData.client_email || offerData.clients?.email || '',
      clientPhone: offerData.clients?.phone || '',
      clientCompany: (offerData as any).client_company || '',
      clientAddress: billingAddress,
      companyLogo: companyLogoBase64,
      companyName: companyBranding.companyName || offerData.companies?.name || '',
      companyAddress: companyBranding.companyAddress || '',
      companyCity: companyBranding.companyCity || '',
      companyPostalCode: companyBranding.companyPostalCode || '',
      companyEmail: companyBranding.companyEmail || '',
      companyPhone: companyBranding.companyPhone || '',
      companyVatNumber: companyBranding.companyVatNumber || '',
      showPrintButton: false,
      isPDFMode: true,
      isPurchase: isPurchase,
      totalSellingPrice: totalSellingPriceCanonical,
      equipment: equipmentData.map((eq: any) => ({
        id: eq.id,
        title: eq.title,
        quantity: eq.quantity || 1,
        monthlyPayment: isPurchase ? 0 : (eq.monthly_payment || 0),
        sellingPrice: eq.selling_price || 0,
        imageUrl: eq.image_url || eq.product?.image_urls?.[0] || eq.product?.image_url || null,
        attributes: eq.attributes?.reduce((acc: any, attr: any) => {
          acc[attr.key] = attr.value;
          return acc;
        }, {}) || {},
        specifications: eq.specifications?.reduce((acc: any, spec: any) => {
          acc[spec.key] = spec.value;
          return acc;
        }, {}) || {}
      })),
      externalServices: enrichedExternalServices,
      promoProducts: enrichedPromoProducts,
      totalMonthly: isPurchase ? 0 : (Number(offerData.monthly_payment) || 0),
      contractDuration: Number(offerData.duration) || 36,
      fileFee: isPurchase ? 0 : Number(offerData.file_fee) || 0,
      insuranceCost: isPurchase ? 0 : Number(offerData.annual_insurance) || 0,
      downPayment: downPayment,
      adjustedMonthlyPayment: adjustedMonthlyPayment,
      financedAmountAfterDownPayment: financedAmountAfterDownPayment,
      discountAmount: Number(offerData.discount_amount) || 0,
      discountType: (offerData as any).discount_type || undefined,
      discountValue: Number((offerData as any).discount_value) || undefined,
      monthlyPaymentBeforeDiscount: Number((offerData as any).monthly_payment_before_discount) || undefined,
      partnerLogos: partnerLogosData?.map(logo => logo.logo_url) || [],
      companyValues: companyValuesData?.map(v => ({
        title: v.title,
        description: v.description,
        iconUrl: v.icon_url,
      })) || [],
      metrics: companyMetricsData?.map(m => ({
        label: m.label,
        value: m.value,
        iconName: m.icon_name,
      })) || [],
      contentBlocks: {
        cover: {
          greeting: contentBlocksMap['cover']?.['greeting'] || '<p>Madame, Monsieur,</p>',
          introduction: isPurchase
            ? (contentBlocksMap['cover']?.['introduction_purchase'] || '<p>Nous avons le plaisir de vous présenter notre offre d\'achat.</p>')
            : (contentBlocksMap['cover']?.['introduction'] || '<p>Nous avons le plaisir de vous présenter notre offre commerciale.</p>'),
          validity: contentBlocksMap['cover']?.['validity'] || '<p>Cette offre est valable 30 jours.</p>',
        },
        equipment: {
          title: contentBlocksMap['equipment']?.['title'] || 'Détail de l\'équipement',
          footer_note: contentBlocksMap['equipment']?.['footer_note'] || 'Tous nos équipements sont garantis.',
        },
        conditions: {
          general_conditions: contentBlocksMap['conditions']?.['general_conditions'] || '<h3>Conditions générales</h3>',
          sale_general_conditions: contentBlocksMap['conditions']?.['sale_general_conditions'] || '',
          additional_info: contentBlocksMap['conditions']?.['additional_info'] || '',
          contact_info: contentBlocksMap['conditions']?.['contact_info'] || 'Contactez-nous pour plus d\'informations.',
        },
      },
    };
  } catch (error) {
    console.error('[COMMERCIAL-OFFER-PDF] Error fetching data:', error);
    return null;
  }
}

/**
 * Génère un PDF à partir du composant CommercialOffer en utilisant html2canvas + jsPDF
 * C'est la méthode identique à celle utilisée dans EmailOfferDialog
 */
export async function generateCommercialOfferPDF(offerId: string): Promise<Blob> {
  console.log('[COMMERCIAL-OFFER-PDF] Generating PDF for offer:', offerId);

  // Récupérer les données de l'offre
  const offerData = await fetchOfferDataForCommercialOffer(offerId);
  if (!offerData) {
    throw new Error('Impossible de récupérer les données de l\'offre');
  }

  // Créer un conteneur off-screen pour le rendu
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '210mm';
  container.style.minHeight = '297mm';
  container.style.background = 'white';
  container.style.zIndex = '-9999';
  container.style.opacity = '0';
  document.body.appendChild(container);

  // Attendre le chargement des polices
  if ('fonts' in document) {
    await document.fonts.ready;
  }
  await new Promise(resolve => setTimeout(resolve, 800));

  container.classList.add('pdf-mode');

  // Rendre le composant
  const root = createRoot(container);
  root.render(
    React.createElement('div', 
      { 
        style: { 
          width: '100%', 
          background: 'white', 
          fontFamily: 'Inter, sans-serif' 
        } 
      },
      React.createElement(CommercialOffer, offerData)
    )
  );

  // Attendre que tout soit rendu
  await new Promise(resolve => setTimeout(resolve, 3500));

  // Vérifier les pages
  const pages = container.querySelectorAll('.page');
  if (pages.length === 0) {
    container.classList.remove('pdf-mode');
    root.unmount();
    document.body.removeChild(container);
    throw new Error('Aucune page trouvée');
  }

  // Générer le PDF avec jsPDF et html2canvas
  const { default: JsPDF } = await import('jspdf');
  const { default: html2canvas } = await import('html2canvas');
  const pdf = new JsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i] as HTMLElement;
    const canvas = await html2canvas(page, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 794,
      height: 1123,
      windowWidth: 794,
      windowHeight: 1123
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    if (i > 0) {
      pdf.addPage();
    }
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  }

  // Créer le Blob
  const pdfBlob = pdf.output('blob');

  // Nettoyage
  container.classList.remove('pdf-mode');
  root.unmount();
  document.body.removeChild(container);

  console.log('[COMMERCIAL-OFFER-PDF] PDF generated successfully, size:', pdfBlob.size);
  return pdfBlob;
}

/**
 * Génère ET télécharge le PDF d'offre (moteur unique). Nom de fichier canonique
 * identique à celui de la page offre : Offre_<numéro>_<Client>_<date>.pdf
 */
export async function downloadCommercialOfferPDF(offerId: string): Promise<void> {
  const blob = await generateCommercialOfferPDF(offerId);

  const { data: o } = await supabase
    .from('offers')
    .select('dossier_number, client_name, client_company')
    .eq('id', offerId)
    .single();

  const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
  const offerNumber = o?.dossier_number || `OFF-${offerId.slice(0, 6)}`;
  const clientName = ((o as any)?.client_company || o?.client_name || 'Client')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 30);
  const filename = `Offre_${offerNumber}_${clientName}_${date}.pdf`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Récupère les infos de l'offre pour le nom de fichier
 */
export async function getOfferInfoForFilename(offerId: string): Promise<{ clientName: string; offerNumber: string }> {
  const { data } = await supabase
    .from('offers')
    .select('client_name, dossier_number')
    .eq('id', offerId)
    .single();

  return {
    clientName: data?.client_name || 'Client',
    offerNumber: data?.dossier_number || offerId,
  };
}
