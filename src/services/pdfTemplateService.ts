import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

export interface PDFTemplate {
  id: string;
  name: string;
  template_type: 'standard' | 'ambassador' | 'custom';
  company_id: string;
  template_file_url?: string;
  field_mappings: Record<string, any>;
  is_active: boolean;
  is_default: boolean;
  template_category: string;
  supported_offer_types: string[];
  companyName: string;
  companyAddress: string;
  companyContact: string;
  companySiret: string;
  logoURL?: string;
  primaryColor: string;
  secondaryColor: string;
  headerText: string;
  footerText: string;
  fields: any[];
  templateImages: any[];
  created_at: string;
  updated_at: string;
}

export interface TemplateForOffer {
  template_id: string;
  template_name: string;
  template_file_url?: string;
  field_mappings: Record<string, any>;
  company_data: Record<string, any>;
}

export class PDFTemplateService {
  /**
   * Récupère tous les templates d'une entreprise
   */
  static async getCompanyTemplates(companyId: string): Promise<PDFTemplate[]> {
    const { data, error } = await supabase
      .from('pdf_templates')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('template_type', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching company templates:', error);
      throw new Error(`Erreur lors du chargement des templates: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Récupère le template approprié pour une offre
   */
  static async getTemplateForOffer(
    companyId: string, 
    offerType: string = 'standard',
    templateCategory: string = 'offer'
  ): Promise<TemplateForOffer | null> {
    const { data, error } = await supabase
      .rpc('get_template_for_offer', {
        p_company_id: companyId,
        p_offer_type: offerType,
        p_template_category: templateCategory
      });

    if (error) {
      console.error('Error fetching template for offer:', error);
      throw new Error(`Erreur lors du chargement du template: ${error.message}`);
    }

    return data?.[0] || null;
  }

  /**
   * Crée un nouveau template
   */
  static async createTemplate(template: Partial<PDFTemplate>): Promise<PDFTemplate> {
    const templateData = {
      id: template.id || uuidv4(),
      name: template.name || 'Nouveau Template',
      template_type: template.template_type || 'standard',
      company_id: template.company_id,
      template_file_url: template.template_file_url,
      field_mappings: template.field_mappings || {},
      is_active: template.is_active ?? true,
      is_default: template.is_default ?? false,
      template_category: template.template_category || 'offer',
      supported_offer_types: template.supported_offer_types || ['standard'],
      companyName: template.companyName || '',
      companyAddress: template.companyAddress || '',
      companyContact: template.companyContact || '',
      companySiret: template.companySiret || '',
      logoURL: template.logoURL,
      primaryColor: template.primaryColor || '#3b82f6',
      secondaryColor: template.secondaryColor || '#64748b',
      headerText: template.headerText || '',
      footerText: template.footerText || '',
      fields: template.fields || [],
      templateImages: template.templateImages || []
    };

    const { data, error } = await supabase
      .from('pdf_templates')
      .insert(templateData)
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      throw new Error(`Erreur lors de la création du template: ${error.message}`);
    }

    return data;
  }

  /**
   * Met à jour un template existant
   */
  static async updateTemplate(templateId: string, updates: Partial<PDFTemplate>): Promise<PDFTemplate> {
    const { data, error } = await supabase
      .from('pdf_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      throw new Error(`Erreur lors de la mise à jour du template: ${error.message}`);
    }

    return data;
  }

  /**
   * Définit un template comme par défaut
   */
  static async setDefaultTemplate(
    templateId: string, 
    companyId: string, 
    templateType: string,
    templateCategory: string = 'offer'
  ): Promise<void> {
    // D'abord, enlever le statut par défaut des autres templates
    await supabase
      .from('pdf_templates')
      .update({ is_default: false })
      .eq('company_id', companyId)
      .eq('template_type', templateType)
      .eq('template_category', templateCategory);

    // Ensuite, définir le nouveau template par défaut
    const { error } = await supabase
      .from('pdf_templates')
      .update({ is_default: true })
      .eq('id', templateId);

    if (error) {
      console.error('Error setting default template:', error);
      throw new Error(`Erreur lors de la définition du template par défaut: ${error.message}`);
    }
  }

  /**
   * Supprime un template (désactivation)
   */
  static async deleteTemplate(templateId: string): Promise<void> {
    const { error } = await supabase
      .from('pdf_templates')
      .update({ 
        is_active: false,
        is_default: false
      })
      .eq('id', templateId);

    if (error) {
      console.error('Error deleting template:', error);
      throw new Error(`Erreur lors de la suppression du template: ${error.message}`);
    }
  }

  /**
   * Upload d'un fichier template
   */
  static async uploadTemplateFile(file: File, companyId: string, templateId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}/${templateId}/template.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('pdf-templates')
      .upload(fileName, file, {
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading template file:', uploadError);
      throw new Error(`Erreur lors de l'upload du template: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from('pdf-templates')
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  /**
   * Génère les données d'une offre pour injection dans le template
   */
  static async generateOfferData(offerId: string): Promise<Record<string, any>> {
    const { data: offer, error } = await supabase
      .from('offers')
      .select(`
        *,
        clients(*),
        ambassadors(*),
        offer_equipment(*)
      `)
      .eq('id', offerId)
      .single();

    if (error) {
      console.error('Error fetching offer data:', error);
      throw new Error(`Erreur lors du chargement des données de l'offre: ${error.message}`);
    }

    // Formatage des données pour le template
    return {
      // Données de l'offre
      offer_id: offer.id,
      offer_number: `OFF-${offer.id.substring(0, 8).toUpperCase()}`,
      created_at: new Date(offer.created_at).toLocaleDateString('fr-FR'),
      amount: offer.amount,
      monthly_payment: offer.monthly_payment,
      commission: offer.commission,
      status: offer.status,
      workflow_status: offer.workflow_status,
      
      // Données client
      client_name: offer.client_name,
      client_email: offer.client_email,
      client_company: offer.clients?.company || '',
      client_phone: offer.clients?.phone || '',
      client_address: offer.clients?.address || '',
      client_city: offer.clients?.city || '',
      client_postal_code: offer.clients?.postal_code || '',
      client_country: offer.clients?.country || '',
      client_vat_number: offer.clients?.vat_number || '',
      
      // Données ambassadeur (si applicable)
      ambassador_name: offer.ambassadors?.name || '',
      ambassador_email: offer.ambassadors?.email || '',
      ambassador_phone: offer.ambassadors?.phone || '',
      ambassador_company: offer.ambassadors?.company || '',
      
      // Équipements
      equipment_description: offer.equipment_description,
      equipment_list: offer.offer_equipment || [],
      
      // Données système
      current_date: new Date().toLocaleDateString('fr-FR'),
      current_datetime: new Date().toLocaleString('fr-FR'),
      
      // Signature
      signature_data: offer.signature_data,
      signer_name: offer.signer_name,
      signed_at: offer.signed_at ? new Date(offer.signed_at).toLocaleString('fr-FR') : ''
    };
  }
}