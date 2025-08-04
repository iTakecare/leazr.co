import { supabase } from "@/integrations/supabase/client";
import { CustomPdfTemplate, CreateCustomPdfTemplateData } from "@/types/customPdfTemplate";

export const customPdfTemplateService = {
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
      .select(`
        *,
        clients (
          id,
          name,
          company
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur récupération templates:', error);
      throw error;
    }

    return data || [];
  },

  // Récupérer le template actif d'un client
  async getActiveTemplateByClient(clientId: string): Promise<CustomPdfTemplate | null> {
    const { data, error } = await supabase
      .from('custom_pdf_templates')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Erreur récupération template client:', error);
      throw error;
    }

    return data || null;
  },

  // Créer un nouveau template
  async createTemplate(templateData: CreateCustomPdfTemplateData): Promise<CustomPdfTemplate> {
    // D'abord désactiver l'ancien template s'il existe
    if (templateData.is_active !== false) {
      await this.deactivateClientTemplates(templateData.client_id);
    }

    const { data, error } = await supabase
      .from('custom_pdf_templates')
      .insert([{
        ...templateData,
        company_id: (await this.getCurrentUserCompanyId())
      }])
      .select()
      .single();

    if (error) {
      console.error('Erreur création template:', error);
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
      console.error('Erreur mise à jour template:', error);
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
      console.error('Erreur suppression template:', error);
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
      console.error('Erreur désactivation templates:', error);
      throw error;
    }
  },

  // Activer un template spécifique (désactive automatiquement les autres)
  async activateTemplate(templateId: string, clientId: string): Promise<void> {
    // Désactiver tous les templates du client
    await this.deactivateClientTemplates(clientId);
    
    // Activer le template choisi
    const { error } = await supabase
      .from('custom_pdf_templates')
      .update({ is_active: true })
      .eq('id', templateId);

    if (error) {
      console.error('Erreur activation template:', error);
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