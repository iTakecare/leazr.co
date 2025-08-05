import { supabase } from '@/integrations/supabase/client';
import { ImageTemplate, CreateImageTemplateData } from '@/types/imageTemplate';

class ImageTemplateService {
  async createImageTemplate(templateData: CreateImageTemplateData): Promise<ImageTemplate> {
    const companyId = await this.getCurrentUserCompanyId();
    
    // Désactiver les templates existants pour cette entreprise
    await this.deactivateCompanyTemplates(companyId);
    
    const { data, error } = await supabase
      .from('custom_pdf_templates')
      .insert({
        company_id: companyId,
        name: templateData.name,
        description: templateData.description,
        original_pdf_url: '', // Pas de PDF source pour les templates images
        is_active: true,
        field_mappings: {},
        template_metadata: {
          template_type: 'image-based',
          pages_count: templateData.pages.length,
          pages_data: templateData.pages
        }
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur lors de la création du template: ${error.message}`);
    }

    return {
      ...data,
      template_type: 'image-based',
      fields: [],
      pages: templateData.pages
    } as ImageTemplate;
  }

  async updateImageTemplate(templateId: string, updates: Partial<ImageTemplate>): Promise<ImageTemplate> {
    const { data, error } = await supabase
      .from('custom_pdf_templates')
      .update({
        name: updates.name,
        description: updates.description,
        template_metadata: updates.pages ? {
          template_type: 'image-based',
          pages_count: updates.pages.length,
          pages_data: updates.pages
        } : undefined
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
    }

    return {
      ...data,
      template_type: 'image-based',
      fields: data.field_mappings?.fields || [],
      pages: data.template_metadata?.pages_data || []
    } as ImageTemplate;
  }

  async deleteImageTemplate(templateId: string): Promise<void> {
    const { error } = await supabase
      .from('custom_pdf_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      throw new Error(`Erreur lors de la suppression: ${error.message}`);
    }
  }

  private async getCurrentUserCompanyId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (error || !profile?.company_id) {
      throw new Error('Company ID non trouvé pour cet utilisateur');
    }

    return profile.company_id;
  }

  private async deactivateCompanyTemplates(companyId: string): Promise<void> {
    const { error } = await supabase
      .from('custom_pdf_templates')
      .update({ is_active: false })
      .eq('company_id', companyId);

    if (error) {
      throw new Error(`Erreur lors de la désactivation: ${error.message}`);
    }
  }
}

export default new ImageTemplateService();