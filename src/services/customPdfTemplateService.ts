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
    console.log('🚀 Début de la création du template:', templateData.name);
    
    try {
      // Validation des données
      await this.validateTemplateData(templateData);
      
      // Récupérer le company_id
      const companyId = await this.getCurrentUserCompanyId();
      console.log('✅ Company ID pour le template:', companyId);
      
      // D'abord désactiver tous les templates existants pour ce client
      console.log('🔄 Désactivation des templates existants pour le client:', templateData.client_id);
      await this.deactivateClientTemplates(templateData.client_id);

      // Préparer les données d'insertion
      const insertData = {
        ...templateData,
        company_id: companyId,
        is_active: templateData.is_active ?? true
      };
      
      console.log('📝 Données à insérer:', {
        name: insertData.name,
        client_id: insertData.client_id,
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
          throw new Error('Un template avec ce nom existe déjà pour ce client');
        }
        if (error.code === '23503') {
          throw new Error('Référence invalide - vérifiez les données du client');
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
    
    if (!templateData.client_id) {
      throw new Error('L\'ID du client est obligatoire');
    }
    
    if (!templateData.original_pdf_url || templateData.original_pdf_url.trim().length === 0) {
      throw new Error('L\'URL du PDF original est obligatoire');
    }
    
    // Vérifier que le client existe et appartient à la même entreprise
    const companyId = await this.getCurrentUserCompanyId();
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, company_id')
      .eq('id', templateData.client_id)
      .eq('company_id', companyId)
      .single();
    
    if (clientError || !client) {
      console.error('❌ Client non trouvé ou appartient à une autre entreprise:', clientError);
      throw new Error('Client non trouvé ou non autorisé');
    }
    
    console.log('✅ Validation réussie - Client:', client.name);
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