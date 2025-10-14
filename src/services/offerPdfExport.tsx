import { pdf } from '@react-pdf/renderer';
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

    // 2. Récupérer les infos de l'entreprise
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name, logo_url')
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

    // 4. Sélectionner le template
    const templateInfo = getTemplateById(options.templateId || 'classic-business');
    const TemplateComponent = templateInfo.component;

    console.log('[PDF EXPORT] Using template:', templateInfo.name);

    // 5. Générer le PDF avec React-PDF
    const blob = await pdf(
      <TemplateComponent
        offer={offerData}
        equipment={equipmentData}
        companyName={company.name}
        companyLogo={company.logo_url}
        customizations={options.customizations}
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
      .select('name, logo_url')
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

    const templateInfo = getTemplateById(options.templateId || 'classic-business');
    const TemplateComponent = templateInfo.component;

    const blob = await pdf(
      <TemplateComponent
        offer={offerData}
        equipment={equipmentData}
        companyName={company.name}
        companyLogo={company.logo_url}
        customizations={options.customizations}
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    console.log('[PDF PREVIEW] Preview URL generated');
    
    return url;
  } catch (error: any) {
    console.error('[PDF PREVIEW] Error:', error);
    throw new Error(error.message || 'Erreur lors de la prévisualisation');
  }
}
