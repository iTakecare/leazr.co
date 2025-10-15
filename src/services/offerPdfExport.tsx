import { pdf, Document, Page, Text } from '@react-pdf/renderer';
import { supabase } from '@/integrations/supabase/client';
import { getTemplateById } from '@/components/offer/pdf/templates';

interface PdfExportOptions {
  templateId?: string;
  customizations?: {
    primaryColor?: string;
    secondaryColor?: string;
    showLogo?: boolean;
    showFooter?: boolean;
  };
}

export async function exportOfferAsPdf(
  offerId: string,
  options: PdfExportOptions = {}
) {
  try {
    console.log('[PDF EXPORT] Starting export for offer:', offerId);

    // 1. Récupérer les données de l'offre avec équipements
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select(`
        *,
        clients (
          name,
          company,
          email,
          phone
        )
      `)
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      throw new Error('Offre introuvable');
    }

    const { data: equipment, error: equipmentError } = await supabase
      .from('offer_equipment')
      .select('*')
      .eq('offer_id', offerId)
      .order('created_at', { ascending: true });

    if (equipmentError) {
      throw new Error('Erreur lors de la récupération des équipements');
    }

    // 2. Récupérer les infos de l'entreprise et son template_design
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name, logo_url, template_design')
      .eq('id', offer.company_id)
      .single();

    if (companyError || !company) {
      throw new Error('Entreprise introuvable');
    }

    // 3. Préparer les données pour le template
    const offerData = {
      id: offer.id,
      client_name: offer.clients?.name || offer.client_name,
      client_company: offer.clients?.company,
      client_email: offer.clients?.email,
      client_phone: offer.clients?.phone,
      amount: offer.amount || 0,
      monthly_payment: offer.monthly_payment,
      created_at: offer.created_at,
    };

    const equipmentData = (equipment || []).map(eq => ({
      id: eq.id,
      title: eq.title,
      quantity: eq.quantity || 1,
      purchase_price: eq.purchase_price || 0,
      selling_price: eq.selling_price,
      monthly_payment: eq.monthly_payment,
    }));

    // 4. Utiliser le template design de l'entreprise
    const templateInfo = getTemplateById('classic-business');
    const TemplateComponent = templateInfo.component;

    console.log('[PDF EXPORT] Using company template design');

    // S'assurer que template_design est un objet
    let design: any = company.template_design as any;
    if (typeof design === 'string') {
      try {
        design = JSON.parse(design);
        console.log('[PDF EXPORT] Parsed template_design from JSON string');
      } catch (e) {
        console.warn('[PDF EXPORT] Could not parse template_design string');
      }
    }

    // 5. Générer le PDF avec React-PDF
    const blob = await pdf(
      <TemplateComponent
        offer={offerData}
        equipment={equipmentData}
        companyName={company.name}
        companyLogo={company.logo_url}
        design={design}
      />
    ).toBlob();

    console.log('[PDF EXPORT] PDF generated successfully');

    // 6. Télécharger le fichier
    const fileName = `Offre_${offer.id.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('[PDF EXPORT] PDF downloaded:', fileName);

    return { success: true, fileName };
  } catch (error: any) {
    console.error('[PDF EXPORT] Error:', error);
    throw new Error(error.message || 'Erreur lors de la génération du PDF');
  }
}

export async function previewOfferPdf(
  offerId: string,
  options: PdfExportOptions = {}
): Promise<string> {
  try {
    console.log('[PDF PREVIEW] Starting preview for offer:', offerId);

    // Même logique que exportOfferAsPdf mais retourne un blob URL au lieu de télécharger
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select(`
        *,
        clients (
          name,
          company,
          email,
          phone
        )
      `)
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      throw new Error('Offre introuvable');
    }

    const { data: equipment } = await supabase
      .from('offer_equipment')
      .select('*')
      .eq('offer_id', offerId)
      .order('created_at', { ascending: true });

    const { data: company } = await supabase
      .from('companies')
      .select('name, logo_url, template_design')
      .eq('id', offer.company_id)
      .single();

    if (!company) {
      throw new Error('Entreprise introuvable');
    }

    const offerData = {
      id: offer.id,
      client_name: offer.clients?.name || offer.client_name,
      client_company: offer.clients?.company,
      client_email: offer.clients?.email,
      client_phone: offer.clients?.phone,
      amount: offer.amount || 0,
      monthly_payment: offer.monthly_payment,
      created_at: offer.created_at,
    };

    const equipmentData = (equipment || []).map(eq => ({
      id: eq.id,
      title: eq.title,
      quantity: eq.quantity || 1,
      purchase_price: eq.purchase_price || 0,
      selling_price: eq.selling_price,
      monthly_payment: eq.monthly_payment,
    }));

    const templateInfo = getTemplateById('classic-business');
    const TemplateComponent = templateInfo.component;

    // S'assurer que template_design est un objet
    let design: any = company.template_design as any;
    if (typeof design === 'string') {
      try {
        design = JSON.parse(design);
        console.log('[PDF PREVIEW] Parsed template_design from JSON string');
      } catch (e) {
        console.warn('[PDF PREVIEW] Could not parse template_design string');
      }
    }

    const blob = await pdf(
      <TemplateComponent
        offer={offerData}
        equipment={equipmentData}
        companyName={company.name}
        companyLogo={company.logo_url}
        design={design}
      />
    ).toBlob();

    // Diagnostics et type MIME
    console.log('[PDF PREVIEW] Blob size:', blob.size, 'type:', blob.type);
    let head = '';
    try {
      head = await blob.slice(0, 5).text();
    } catch (e) {
      head = 'slice-error';
    }
    console.log('[PDF PREVIEW] Blob head (should start with %PDF-):', head);
    if (!blob || blob.size === 0) {
      throw new Error('Le PDF généré est vide (0 octet).');
    }

    const typedBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
    const url = URL.createObjectURL(typedBlob);
    console.log('[PDF PREVIEW] Preview URL generated');
    
    return url;
  } catch (error: any) {
    console.error('[PDF PREVIEW] Error:', error);
    throw new Error(error.message || 'Erreur lors de la prévisualisation');
  }
}

/**
 * Preview full template design with example data (includes all custom pages)
 * Useful for previewing the template in settings without needing a real offer
 */
export async function previewFullTemplate(): Promise<string> {
  try {
    console.log('[TEMPLATE PREVIEW] Starting full template preview generation');

    // Get current user's company
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[TEMPLATE PREVIEW] No user found');
      throw new Error('Utilisateur non connecté');
    }
    console.log('[TEMPLATE PREVIEW] User ID:', user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      console.error('[TEMPLATE PREVIEW] No company_id in profile');
      throw new Error('Entreprise non trouvée');
    }
    console.log('[TEMPLATE PREVIEW] Company ID:', profile.company_id);

    const { data: company } = await supabase
      .from('companies')
      .select('name, logo_url, template_design')
      .eq('id', profile.company_id)
      .single();

    if (!company) {
      console.error('[TEMPLATE PREVIEW] No company data found');
      throw new Error('Données entreprise introuvables');
    }
    console.log('[TEMPLATE PREVIEW] Company loaded:', company.name);

    // Parse template_design if it's a JSON string
    let design = company.template_design;
    if (typeof design === 'string') {
      try {
        design = JSON.parse(design);
        console.log('[TEMPLATE PREVIEW] Parsed template_design from JSON string');
      } catch (e) {
        console.warn('[TEMPLATE PREVIEW] Could not parse template_design:', e);
      }
    }

    console.log('[TEMPLATE PREVIEW] Design loaded, pages count:', design?.pages?.length || 0);

    // Create example offer data
    const exampleOfferData = {
      id: 'example-preview',
      client_name: 'John Doe',
      client_company: 'Entreprise ABC',
      client_email: 'john@example.com',
      client_phone: '+32 123 456 789',
      amount: 3600,
      monthly_payment: 100,
      created_at: new Date().toISOString(),
    };

    const exampleEquipment = [
      {
        id: 'eq-1',
        title: 'MacBook Pro',
        quantity: 2,
        purchase_price: 1500,
        selling_price: 1800,
        monthly_payment: 50,
      },
    ];

    console.log('[TEMPLATE PREVIEW] Loading template component');
    const templateInfo = getTemplateById('classic-business');
    const TemplateComponent = templateInfo.component;

    console.log('[TEMPLATE PREVIEW] Generating PDF blob');
    const blob = await pdf(
      <TemplateComponent
        offer={exampleOfferData}
        equipment={exampleEquipment}
        companyName={company.name}
        companyLogo={company.logo_url}
        design={design}
      />
    ).toBlob();

    console.log('[TEMPLATE PREVIEW] Blob size:', blob.size, 'type:', blob.type);
    // Vérifier l'en-tête PDF
    let head = '';
    try {
      head = await blob.slice(0, 5).text();
    } catch (e) {
      head = 'slice-error';
    }
    console.log('[TEMPLATE PREVIEW] Blob head (should start with %PDF-):', head);
    if (!blob || blob.size === 0) {
      throw new Error('Le PDF généré est vide (0 octet). Vérifiez le template et les images.');
    }

    const typedBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
    const url = URL.createObjectURL(typedBlob);
    console.log('[TEMPLATE PREVIEW] Full preview URL generated successfully');
    
    return url;
  } catch (error: any) {
    console.error('[TEMPLATE PREVIEW] Fatal error:', error);
    console.error('[TEMPLATE PREVIEW] Error stack:', error.stack);
    throw new Error(error.message || 'Erreur lors de la prévisualisation du template');
  }
}

export async function previewMinimalPdf(): Promise<string> {
  const blob = await pdf(
    <Document>
      <Page size="A4">
        <Text>PDF Test OK</Text>
      </Page>
    </Document>
  ).toBlob();

  console.log('[PDF MINIMAL] size:', blob.size, 'type:', blob.type);
  let head = '';
  try { head = await blob.slice(0,5).text(); } catch {}
  console.log('[PDF MINIMAL] head:', head);

  const typedBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
  return URL.createObjectURL(typedBlob);
}
