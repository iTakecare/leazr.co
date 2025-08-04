import { supabase } from "@/integrations/supabase/client";
import { CustomPdfTemplate, CreateCustomPdfTemplateData } from "@/types/customPdfTemplate";

// Service de gestion des templates PDF personnalisés
const customPdfTemplateService = {
  // Récupérer un template par ID
  async getTemplate(templateId: string): Promise<CustomPdfTemplate | null> {
    const { data, error } = await supabase
      .from('custom_pdf_templates')
      .select('*, clients(name)')
      .eq('id', templateId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching template:', error);
      throw error;
    }

    return data;
  },

  // Récupérer tous les templates d'une entreprise
  async getTemplatesByCompany(): Promise<CustomPdfTemplate[]> {
    const { data, error } = await supabase
      .from('custom_pdf_templates')
      .select('*, clients(name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching company templates:', error);
      throw error;
    }

    return data || [];
  },

  // Récupérer le template actif pour un client
  async getActiveTemplateByClient(clientId?: string): Promise<CustomPdfTemplate | null> {
    if (!clientId) {
      // Si pas de clientId, retourner le premier template actif de l'entreprise
      const { data, error } = await supabase
        .from('custom_pdf_templates')
        .select('*, clients(name)')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching active template:', error);
        throw error;
      }

      return data;
    }

    const { data, error } = await supabase
      .from('custom_pdf_templates')
      .select('*, clients(name)')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching active template:', error);
      throw error;
    }

    return data;
  },

  // Créer un nouveau template
  async createTemplate(templateData: CreateCustomPdfTemplateData): Promise<CustomPdfTemplate> {
    // D'abord désactiver tous les templates existants pour ce client
    await this.deactivateClientTemplates(templateData.client_id);

    const { data, error } = await supabase
      .from('custom_pdf_templates')
      .insert({
        ...templateData,
        company_id: await this.getCurrentUserCompanyId(),
        is_active: templateData.is_active ?? true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      throw error;
    }

    return data;
  },

  // Mettre à jour un template
  async updateTemplate(templateId: string, updates: Partial<CustomPdfTemplate>): Promise<CustomPdfTemplate> {
    const { data, error } = await supabase
      .from('custom_pdf_templates')
      .update(updates)
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      throw error;
    }

    return data;
  },

  // Supprimer un template
  async deleteTemplate(templateId: string): Promise<void> {
    const { error } = await supabase
      .from('custom_pdf_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  },

  // Désactiver tous les templates d'un client
  async deactivateClientTemplates(clientId: string): Promise<void> {
    const { error } = await supabase
      .from('custom_pdf_templates')
      .update({ is_active: false })
      .eq('client_id', clientId);

    if (error) {
      console.error('Error deactivating templates:', error);
      throw error;
    }
  },

  // Activer un template spécifique
  async activateTemplate(templateId: string, clientId: string): Promise<void> {
    // D'abord désactiver tous les autres templates du client
    await this.deactivateClientTemplates(clientId);

    // Puis activer le template sélectionné
    const { error } = await supabase
      .from('custom_pdf_templates')
      .update({ is_active: true })
      .eq('id', templateId);

    if (error) {
      console.error('Error activating template:', error);
      throw error;
    }
  },

  // Fonction utilitaire pour récupérer l'ID de l'entreprise courante
  async getCurrentUserCompanyId(): Promise<string> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .single();
    
    if (!profile?.company_id) {
      throw new Error('Impossible de récupérer l\'ID de l\'entreprise');
    }
    
    return profile.company_id;
  }
};

// Export des fonctions individuelles 
export const getTemplate = customPdfTemplateService.getTemplate.bind(customPdfTemplateService);
export const getTemplatesByCompany = customPdfTemplateService.getTemplatesByCompany.bind(customPdfTemplateService);
export const getActiveTemplateByClient = customPdfTemplateService.getActiveTemplateByClient.bind(customPdfTemplateService);
export const createTemplate = customPdfTemplateService.createTemplate.bind(customPdfTemplateService);
export const updateTemplate = customPdfTemplateService.updateTemplate.bind(customPdfTemplateService);
export const deleteTemplate = customPdfTemplateService.deleteTemplate.bind(customPdfTemplateService);
export const deactivateClientTemplates = customPdfTemplateService.deactivateClientTemplates.bind(customPdfTemplateService);
export const activateTemplate = customPdfTemplateService.activateTemplate.bind(customPdfTemplateService);

// Export par défaut
export default customPdfTemplateService;