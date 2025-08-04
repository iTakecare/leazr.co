import { supabase } from "@/integrations/supabase/client";
import { 
  TemplateLibraryItem, 
  TemplateCategory, 
  TemplateSharing, 
  CustomPdfTemplate 
} from "@/types/customPdfTemplate";

// Service de gestion du partage et de la bibliothèque de templates
export class TemplateSharingService {

  // === TEMPLATE LIBRARY ===

  // Récupérer tous les templates de la bibliothèque
  async getLibraryTemplates(
    categoryId?: string,
    searchQuery?: string,
    featured?: boolean,
    limit: number = 20,
    offset: number = 0
  ): Promise<TemplateLibraryItem[]> {
    let query = supabase
      .from('template_library')
      .select(`
        *,
        template_categories(name, icon)
      `)
      .eq('is_public', true);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%, description.ilike.%${searchQuery}%, tags.cs.{${searchQuery}}`);
    }

    if (featured !== undefined) {
      query = query.eq('is_featured', featured);
    }

    const { data, error } = await query
      .order('is_featured', { ascending: false })
      .order('download_count', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching library templates:', error);
      throw error;
    }

    return data || [];
  }

  // Récupérer les templates populaires
  async getPopularTemplates(limit: number = 10): Promise<TemplateLibraryItem[]> {
    const { data, error } = await supabase
      .from('template_library')
      .select('*')
      .eq('is_public', true)
      .order('download_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching popular templates:', error);
      throw error;
    }

    return data || [];
  }

  // Récupérer les templates en vedette
  async getFeaturedTemplates(limit: number = 6): Promise<TemplateLibraryItem[]> {
    const { data, error } = await supabase
      .from('template_library')
      .select('*')
      .eq('is_public', true)
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching featured templates:', error);
      throw error;
    }

    return data || [];
  }

  // Publier un template dans la bibliothèque
  async publishToLibrary(
    templateId: string,
    name: string,
    description: string,
    categoryId: string,
    tags: string[] = [],
    previewImageUrl?: string
  ): Promise<TemplateLibraryItem> {
    // Récupérer le template original
    const { data: template, error: templateError } = await supabase
      .from('custom_pdf_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      throw new Error('Template not found');
    }

    // Créer l'entrée dans la bibliothèque
    const { data, error } = await supabase
      .from('template_library')
      .insert({
        name,
        description,
        category_id: categoryId,
        original_template_id: templateId,
        field_mappings: template.field_mappings,
        template_metadata: template.template_metadata,
        preview_image_url: previewImageUrl,
        tags,
        is_public: true,
        is_featured: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error publishing to library:', error);
      throw error;
    }

    return data;
  }

  // Télécharger un template depuis la bibliothèque
  async downloadFromLibrary(
    libraryItemId: string,
    clientId: string,
    customName?: string
  ): Promise<CustomPdfTemplate> {
    // Récupérer l'item de la bibliothèque
    const { data: libraryItem, error: libraryError } = await supabase
      .from('template_library')
      .select('*')
      .eq('id', libraryItemId)
      .single();

    if (libraryError || !libraryItem) {
      throw new Error('Library item not found');
    }

    // Créer un nouveau template pour l'utilisateur
    const { data: newTemplate, error: createError } = await supabase
      .from('custom_pdf_templates')
      .insert({
        client_id: clientId,
        name: customName || `${libraryItem.name} (Copy)`,
        description: libraryItem.description,
        original_pdf_url: '', // À définir
        field_mappings: libraryItem.field_mappings,
        template_metadata: {
          ...libraryItem.template_metadata,
          library_source: libraryItemId,
          downloaded_at: new Date().toISOString()
        },
        is_active: true
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating template from library:', createError);
      throw createError;
    }

    // Incrémenter le compteur de téléchargements
    await supabase
      .from('template_library')
      .update({ 
        download_count: libraryItem.download_count + 1 
      })
      .eq('id', libraryItemId);

    return newTemplate;
  }

  // Noter un template de la bibliothèque
  async rateTemplate(libraryItemId: string, rating: number): Promise<void> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const { data: current, error: fetchError } = await supabase
      .from('template_library')
      .select('rating_average, rating_count')
      .eq('id', libraryItemId)
      .single();

    if (fetchError || !current) {
      throw new Error('Template not found');
    }

    // Calculer la nouvelle moyenne
    const newCount = current.rating_count + 1;
    const newAverage = ((current.rating_average * current.rating_count) + rating) / newCount;

    const { error } = await supabase
      .from('template_library')
      .update({
        rating_average: Math.round(newAverage * 10) / 10, // Arrondir à 1 décimale
        rating_count: newCount
      })
      .eq('id', libraryItemId);

    if (error) {
      console.error('Error rating template:', error);
      throw error;
    }
  }

  // === TEMPLATE CATEGORIES ===

  // Récupérer toutes les catégories
  async getCategories(): Promise<TemplateCategory[]> {
    const { data, error } = await supabase
      .from('template_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }

    return data || [];
  }

  // Créer une nouvelle catégorie (admin seulement)
  async createCategory(
    name: string,
    description?: string,
    icon?: string,
    parentCategoryId?: string
  ): Promise<TemplateCategory> {
    const { data, error } = await supabase
      .from('template_categories')
      .insert({
        name,
        description,
        icon,
        parent_category_id: parentCategoryId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      throw error;
    }

    return data;
  }

  // === TEMPLATE SHARING ===

  // Partager un template avec une entreprise ou un utilisateur
  async shareTemplate(
    templateId: string,
    shareWithCompanyId?: string,
    shareWithUserId?: string,
    permissionLevel: 'view' | 'edit' | 'copy' = 'view',
    expiresAt?: Date,
    message?: string
  ): Promise<TemplateSharing> {
    if (!shareWithCompanyId && !shareWithUserId) {
      throw new Error('Must specify either company or user to share with');
    }

    const { data, error } = await supabase
      .from('template_sharing')
      .insert({
        template_id: templateId,
        shared_with_company_id: shareWithCompanyId,
        shared_with_user_id: shareWithUserId,
        permission_level: permissionLevel,
        expires_at: expiresAt?.toISOString(),
        message
      })
      .select()
      .single();

    if (error) {
      console.error('Error sharing template:', error);
      throw error;
    }

    return data;
  }

  // Récupérer les templates partagés avec l'utilisateur/entreprise actuel
  async getSharedTemplates(): Promise<TemplateSharing[]> {
    const { data, error } = await supabase
      .from('template_sharing')
      .select(`
        *,
        custom_pdf_templates(id, name, description, created_at)
      `)
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching shared templates:', error);
      throw error;
    }

    return data || [];
  }

  // Révoquer le partage d'un template
  async revokeSharing(sharingId: string): Promise<void> {
    const { error } = await supabase
      .from('template_sharing')
      .update({ is_active: false })
      .eq('id', sharingId);

    if (error) {
      console.error('Error revoking sharing:', error);
      throw error;
    }
  }

  // Récupérer les partages d'un template
  async getTemplateSharings(templateId: string): Promise<TemplateSharing[]> {
    const { data, error } = await supabase
      .from('template_sharing')
      .select('*')
      .eq('template_id', templateId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching template sharings:', error);
      throw error;
    }

    return data || [];
  }

  // === IMPORT/EXPORT ===

  // Exporter un template au format JSON
  async exportTemplate(templateId: string): Promise<{
    template: CustomPdfTemplate;
    versions?: any[];
    metadata: any;
  }> {
    const { data: template, error } = await supabase
      .from('custom_pdf_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error || !template) {
      throw new Error('Template not found');
    }

    // Récupérer les versions si nécessaire
    const { data: versions } = await supabase
      .from('custom_pdf_template_versions')
      .select('*')
      .eq('template_id', templateId)
      .order('version_number', { ascending: false })
      .limit(5); // Dernières 5 versions

    return {
      template,
      versions: versions || [],
      metadata: {
        exported_at: new Date().toISOString(),
        export_version: '1.0'
      }
    };
  }

  // Importer un template depuis un JSON
  async importTemplate(
    exportData: any,
    clientId: string,
    customName?: string
  ): Promise<CustomPdfTemplate> {
    const template = exportData.template;
    
    if (!template) {
      throw new Error('Invalid export data');
    }

    // Créer le nouveau template
    const { data: newTemplate, error } = await supabase
      .from('custom_pdf_templates')
      .insert({
        client_id: clientId,
        name: customName || `${template.name} (Imported)`,
        description: template.description,
        original_pdf_url: template.original_pdf_url,
        field_mappings: template.field_mappings,
        template_metadata: {
          ...template.template_metadata,
          imported_at: new Date().toISOString(),
          import_source: template.id
        },
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error importing template:', error);
      throw error;
    }

    return newTemplate;
  }
}

// Instance singleton
export const templateSharingService = new TemplateSharingService();

// Export des fonctions individuelles
export const getLibraryTemplates = templateSharingService.getLibraryTemplates.bind(templateSharingService);
export const getPopularTemplates = templateSharingService.getPopularTemplates.bind(templateSharingService);
export const getFeaturedTemplates = templateSharingService.getFeaturedTemplates.bind(templateSharingService);
export const publishToLibrary = templateSharingService.publishToLibrary.bind(templateSharingService);
export const downloadFromLibrary = templateSharingService.downloadFromLibrary.bind(templateSharingService);
export const rateTemplate = templateSharingService.rateTemplate.bind(templateSharingService);
export const getCategories = templateSharingService.getCategories.bind(templateSharingService);
export const createCategory = templateSharingService.createCategory.bind(templateSharingService);
export const shareTemplate = templateSharingService.shareTemplate.bind(templateSharingService);
export const getSharedTemplates = templateSharingService.getSharedTemplates.bind(templateSharingService);
export const revokeSharing = templateSharingService.revokeSharing.bind(templateSharingService);
export const getTemplateSharings = templateSharingService.getTemplateSharings.bind(templateSharingService);
export const exportTemplate = templateSharingService.exportTemplate.bind(templateSharingService);
export const importTemplate = templateSharingService.importTemplate.bind(templateSharingService);

export default templateSharingService;