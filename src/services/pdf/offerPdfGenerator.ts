import { pdf } from '@react-pdf/renderer';
import { supabase } from '@/integrations/supabase/client';
import { htmlToReactPdfConverter } from './htmlToReactPdfConverter';
import HtmlTemplateService, { convertOfferToTemplateData } from '@/services/htmlTemplateService';

/**
 * Service pour générer des PDFs d'offres avec @react-pdf/renderer
 */
export class OfferPdfGenerator {
  private templateService = HtmlTemplateService.getInstance();

  /**
   * Génère un PDF pour une offre et le stocke dans Supabase Storage
   */
  async generateAndStoreOfferPdf(offerId: string): Promise<{
    path: string;
    url: string;
  }> {
    console.log('🎨 Génération du PDF pour l\'offre:', offerId);

    // 1. Récupérer les données de l'offre
    const rawOfferData = await this.fetchOfferData(offerId);
    
    // 2. Extraire company_id avant conversion
    const companyId = rawOfferData.company_id;
    
    if (!companyId) {
      throw new Error('company_id manquant dans les données de l\'offre');
    }
    
    // 3. Récupérer le template HTML
    const template = await this.fetchOfferTemplate(companyId);
    
    // 4. Compiler le template avec les données
    const compiledHtml = this.templateService.compileTemplate(template, rawOfferData);
    
    // 5. Convertir HTML → React-PDF
    const { document: pdfDocument, errors } = htmlToReactPdfConverter.convert(compiledHtml);
    
    if (errors.length > 0) {
      console.warn('⚠️ Avertissements lors de la conversion:', errors);
    }
    
    // 6. Générer le Blob PDF
    const blob = await pdf(pdfDocument).toBlob();
    console.log('✅ PDF généré, taille:', (blob.size / 1024).toFixed(2), 'KB');
    
    // 7. Upload vers Storage
    const { path, url } = await this.uploadPdfToStorage(offerId, companyId, blob);
    
    console.log('✅ PDF stocké:', path);
    
    return { path, url };
  }

  /**
   * Récupère les données complètes d'une offre
   */
  private async fetchOfferData(offerId: string): Promise<any> {
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select(`
        *,
        clients (
          id,
          name,
          email,
          company,
          address,
          city,
          postal_code,
          country
        ),
        companies (
          id,
          name,
          logo_url
        )
      `)
      .eq('id', offerId)
      .single();

    if (offerError) {
      throw new Error(`Erreur lors de la récupération de l'offre: ${offerError.message}`);
    }

    // Récupérer les équipements
    const { data: equipment, error: equipmentError } = await supabase
      .from('offer_equipment')
      .select('*')
      .eq('offer_id', offerId)
      .order('created_at', { ascending: true });

    if (equipmentError) {
      console.warn('Erreur lors de la récupération des équipements:', equipmentError);
    }

    // Convertir au format template mais GARDER les champs originaux nécessaires
    const templateData = convertOfferToTemplateData({
      ...offer,
      equipment_data: equipment || [],
    });

    // Retourner les données template + company_id original
    return {
      ...templateData,
      company_id: offer.company_id, // Préserver le company_id
      id: offer.id // Préserver l'id
    };
  }

  /**
   * Récupère le template HTML pour une entreprise
   */
  private async fetchOfferTemplate(companyId: string): Promise<string> {
    const { data: templates, error } = await supabase
      .from('html_templates')
      .select('html_content')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !templates || templates.length === 0) {
      throw new Error('Aucun template HTML trouvé pour cette entreprise');
    }

    return templates[0].html_content;
  }

  /**
   * Upload le PDF vers Supabase Storage
   */
  private async uploadPdfToStorage(
    offerId: string,
    companyId: string,
    blob: Blob
  ): Promise<{ path: string; url: string }> {
    const fileName = `${offerId}.pdf`;
    const filePath = `company-${companyId}/${fileName}`;

    // Upload vers le bucket offer-pdfs
    const { error: uploadError } = await supabase.storage
      .from('offer-pdfs')
      .upload(filePath, blob, {
        contentType: 'application/pdf',
        upsert: true, // Remplacer si existe déjà
      });

    if (uploadError) {
      throw new Error(`Erreur lors de l'upload du PDF: ${uploadError.message}`);
    }

    // Générer une URL signée (valide 7 jours)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('offer-pdfs')
      .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 jours

    if (signedUrlError) {
      throw new Error(`Erreur lors de la création de l'URL signée: ${signedUrlError.message}`);
    }

    return {
      path: filePath,
      url: signedUrlData.signedUrl,
    };
  }

  /**
   * Récupère un PDF depuis Storage (pour envoi par email)
   */
  async getPdfFromStorage(pdfPath: string): Promise<Blob> {
    const { data, error } = await supabase.storage
      .from('offer-pdfs')
      .download(pdfPath);

    if (error) {
      throw new Error(`Erreur lors de la récupération du PDF: ${error.message}`);
    }

    return data;
  }
}

export const offerPdfGenerator = new OfferPdfGenerator();
