import { supabase } from "@/integrations/supabase/client";
import { CustomPdfTemplate, CreateCustomPdfTemplateData } from "@/types/customPdfTemplate";

// Service de gestion des templates PDF personnalisés
const customPdfTemplateService = {
  // Récupérer un template par ID
  async getTemplate(templateId: string): Promise<CustomPdfTemplate | null> {
    const { data, error } = await supabase
      .from('custom_pdf_templates')
      .select('*')
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
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching company templates:', error);
      throw error;
    }

    return data || [];
  },

  // Récupérer le template actif pour l'entreprise
  async getActiveTemplate(): Promise<CustomPdfTemplate | null> {
    try {
      const currentUserCompanyId = await this.getCurrentUserCompanyId();
      if (!currentUserCompanyId) {
        throw new Error('Utilisateur non connecté ou entreprise non trouvée');
      }

      const { data, error } = await supabase
        .from('custom_pdf_templates')
        .select('*')
        .eq('company_id', currentUserCompanyId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Erreur lors de la récupération du template actif:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erreur dans getActiveTemplate:', error);
      throw error;
    }
  },

  // Créer un nouveau template
  async createTemplate(templateData: CreateCustomPdfTemplateData): Promise<CustomPdfTemplate> {
    console.log('🚀 Début de la création du template:', templateData.name);
    
    try {
      // Validation des données
      await this.validateTemplateData(templateData);
      
      // Récupérer le company_id
      const companyId = await this.getCurrentUserCompanyId();
      console.log('✅ Company ID pour le template:', companyId);
      
      // D'abord désactiver tous les templates existants pour cette entreprise
      console.log('🔄 Désactivation des templates existants pour l\'entreprise');
      await this.deactivateCompanyTemplates();

      // Préparer les données d'insertion
      const insertData = {
        ...templateData,
        company_id: companyId,
        is_active: templateData.is_active ?? true
      };
      
      console.log('📝 Données à insérer:', {
        name: insertData.name,
        company_id: insertData.company_id,
        is_active: insertData.is_active,
        field_mappings_size: JSON.stringify(insertData.field_mappings || {}).length
      });

      const { data, error } = await supabase
        .from('custom_pdf_templates')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur lors de l\'insertion en base:', error);
        
        // Messages d'erreur plus spécifiques
        if (error.code === '23505') {
          throw new Error('Un template avec ce nom existe déjà pour cette entreprise');
        }
        if (error.code === '23503') {
          throw new Error('Référence invalide - vérifiez les données');
        }
        if (error.code === '42501') {
          throw new Error('Permissions insuffisantes pour créer un template');
        }
        
        throw new Error(`Erreur de base de données: ${error.message}`);
      }

      if (!data) {
        console.error('❌ Aucune donnée retournée après insertion');
        throw new Error('Template créé mais impossible de récupérer les données');
      }

      console.log('✅ Template créé avec succès - ID:', data.id);
      return data;
      
    } catch (error) {
      console.error('💥 Erreur lors de la création du template:', error);
      throw error;
    }
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

  // Supprimer un template et ses fichiers associés
  async deleteTemplate(templateId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      throw new Error('Utilisateur non connecté');
    }

    // Récupérer le template pour obtenir l'URL du fichier
    const { data: template, error: fetchError } = await supabase
      .from('custom_pdf_templates')
      .select('original_pdf_url')
      .eq('id', templateId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Erreur lors de la récupération du template:', fetchError);
      throw new Error(`Erreur lors de la récupération du template: ${fetchError.message}`);
    }

    // Supprimer le fichier du bucket si il existe
    if (template?.original_pdf_url) {
      try {
        const fileName = template.original_pdf_url.split('/').pop();
        if (fileName) {
          const { error: storageError } = await supabase.storage
            .from('pdf-templates')
            .remove([fileName]);
          
          if (storageError) {
            console.warn('Erreur lors de la suppression du fichier:', storageError);
            // Continue quand même avec la suppression du template
          }
        }
      } catch (error) {
        console.warn('Erreur lors de la suppression du fichier:', error);
        // Continue quand même avec la suppression du template
      }
    }

    // Supprimer le template de la base de données
    const { error } = await supabase
      .from('custom_pdf_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  },

  // Désactiver tous les templates d'une entreprise
  async deactivateCompanyTemplates(): Promise<void> {
    try {
      const currentUserCompanyId = await this.getCurrentUserCompanyId();
      if (!currentUserCompanyId) {
        throw new Error('Utilisateur non connecté ou entreprise non trouvée');
      }

      const { error } = await supabase
        .from('custom_pdf_templates')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('company_id', currentUserCompanyId);

      if (error) {
        console.error('Erreur lors de la désactivation des templates entreprise:', error);
        throw error;
      }
    } catch (error) {
      console.error('Erreur dans deactivateCompanyTemplates:', error);
      throw error;
    }
  },

  // Activer un template spécifique
  async activateTemplate(templateId: string): Promise<void> {
    try {
      const currentUserCompanyId = await this.getCurrentUserCompanyId();
      if (!currentUserCompanyId) {
        throw new Error('Utilisateur non connecté ou entreprise non trouvée');
      }

      // D'abord désactiver tous les autres templates pour cette entreprise
      await this.deactivateCompanyTemplates();

      // Puis activer le template sélectionné
      const { error } = await supabase
        .from('custom_pdf_templates')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', templateId)
        .eq('company_id', currentUserCompanyId);

      if (error) {
        console.error('Erreur lors de l\'activation du template:', error);
        throw error;
      }
    } catch (error) {
      console.error('Erreur dans activateTemplate:', error);
      throw error;
    }
  },

  // Fonction utilitaire pour récupérer l'ID de l'entreprise courante
  async getCurrentUserCompanyId(): Promise<string> {
    console.log('🔍 Récupération du company_id de l\'utilisateur actuel...');
    
    try {
      // Vérifier d'abord si l'utilisateur est connecté
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ Erreur d\'authentification:', authError);
        throw new Error('Utilisateur non authentifié');
      }
      
      if (!user) {
        console.error('❌ Aucun utilisateur connecté');
        throw new Error('Aucun utilisateur connecté');
      }
      
      console.log('✅ Utilisateur connecté:', user.email);
      
      // Récupérer le profil de l'utilisateur
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, company_id, role, first_name, last_name')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('❌ Erreur lors de la récupération du profil:', profileError);
        throw new Error('Impossible de récupérer le profil utilisateur');
      }
      
      if (!profile) {
        console.error('❌ Aucun profil trouvé pour l\'utilisateur');
        throw new Error('Profil utilisateur non trouvé');
      }
      
      console.log('👤 Profil utilisateur:', {
        id: profile.id,
        company_id: profile.company_id,
        role: profile.role,
        name: `${profile.first_name} ${profile.last_name}`
      });
      
      if (!profile.company_id) {
        console.error('❌ Aucun company_id dans le profil');
        throw new Error('L\'utilisateur n\'est associé à aucune entreprise');
      }
      
      console.log('✅ Company ID récupéré:', profile.company_id);
      return profile.company_id;
      
    } catch (error) {
      console.error('💥 Erreur dans getCurrentUserCompanyId:', error);
      throw error;
    }
  },

  // Validation des données avant sauvegarde
  async validateTemplateData(templateData: CreateCustomPdfTemplateData): Promise<void> {
    console.log('🔍 Validation des données du template...');
    
    if (!templateData.name || templateData.name.trim().length === 0) {
      throw new Error('Le nom du template est obligatoire');
    }
    
    if (!templateData.original_pdf_url || templateData.original_pdf_url.trim().length === 0) {
      throw new Error('L\'URL du PDF original est obligatoire');
    }
    
    // Vérifier que l'utilisateur a une entreprise
    const companyId = await this.getCurrentUserCompanyId();
    if (!companyId) {
      throw new Error('Utilisateur non connecté ou entreprise non trouvée');
    }
    
    console.log('✅ Validation réussie pour l\'entreprise:', companyId);
  }
};

// Export des fonctions individuelles 
export const getTemplate = customPdfTemplateService.getTemplate.bind(customPdfTemplateService);
export const getTemplatesByCompany = customPdfTemplateService.getTemplatesByCompany.bind(customPdfTemplateService);
export const getActiveTemplate = customPdfTemplateService.getActiveTemplate.bind(customPdfTemplateService);
export const createTemplate = customPdfTemplateService.createTemplate.bind(customPdfTemplateService);
export const updateTemplate = customPdfTemplateService.updateTemplate.bind(customPdfTemplateService);
export const deleteTemplate = customPdfTemplateService.deleteTemplate.bind(customPdfTemplateService);
export const deactivateCompanyTemplates = customPdfTemplateService.deactivateCompanyTemplates.bind(customPdfTemplateService);
export const activateTemplate = customPdfTemplateService.activateTemplate.bind(customPdfTemplateService);

// Maintenir la compatibilité avec l'ancien nom
export const getActiveTemplateByClient = customPdfTemplateService.getActiveTemplate.bind(customPdfTemplateService);
export const deactivateClientTemplates = customPdfTemplateService.deactivateCompanyTemplates.bind(customPdfTemplateService);

// Export par défaut
export default customPdfTemplateService;