import { getSupabaseClient } from "@/integrations/supabase/client";
import { pdfModelImageService, PDFModelImage } from "@/services/pdfModelImageService";

export interface PDFModel {
  id: string;
  name: string;
  companyName: string;
  companyAddress: string;
  companyContact: string;
  companySiret: string;
  logoURL: string;
  primaryColor: string;
  secondaryColor: string;
  headerText: string;
  footerText: string;
  templateImages: PDFModelImage[];
  fields: any[];
  company_id: string;
  created_at?: string;
  updated_at?: string;
}

// Modèle par défaut sans company_id (sera ajouté dynamiquement)
export const DEFAULT_MODEL_TEMPLATE = {
  name: 'Modèle par défaut',
  companyName: 'Votre Entreprise',
  companyAddress: 'Adresse à renseigner',
  companyContact: 'contact@votre-entreprise.com',
  companySiret: 'SIRET à renseigner',
  logoURL: '',
  primaryColor: '#3b82f6',
  secondaryColor: '#64748b',
  headerText: 'Offre de Leasing',
  footerText: 'Merci de votre confiance',
  templateImages: [] as PDFModelImage[],
  fields: [] as any[],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Fonction pour obtenir l'ID de l'entreprise de l'utilisateur actuel
export const getCurrentCompanyId = async (): Promise<string | null> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('get_current_user_company_id_secure');
    
    if (error) {
      console.error('Erreur RPC get_current_user_company_id_secure:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Erreur lors de la récupération de company_id:', error);
    return null;
  }
};

// Validation des champs obligatoires
const validatePDFModel = (model: Partial<PDFModel>): string[] => {
  const errors: string[] = [];
  const requiredFields = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Nom' },
    { key: 'companyName', label: 'Nom de l\'entreprise' },
    { key: 'companyAddress', label: 'Adresse de l\'entreprise' },
    { key: 'companyContact', label: 'Contact de l\'entreprise' },
    { key: 'companySiret', label: 'SIRET de l\'entreprise' },
    { key: 'primaryColor', label: 'Couleur primaire' },
    { key: 'secondaryColor', label: 'Couleur secondaire' },
    { key: 'headerText', label: 'Texte d\'en-tête' },
    { key: 'footerText', label: 'Texte de pied de page' },
    { key: 'company_id', label: 'ID de l\'entreprise' }
  ];

  requiredFields.forEach(field => {
    if (!model[field.key as keyof PDFModel] || 
        (typeof model[field.key as keyof PDFModel] === 'string' && 
         (model[field.key as keyof PDFModel] as string).trim() === '')) {
      errors.push(`${field.label} est requis`);
    }
  });

  return errors;
};

// Fonction pour valider le format des couleurs
const isValidColor = (color: string): boolean => {
  // Accepter format HEX (#ffffff ou #fff)
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  // Accepter format HSL (hsl(0, 0%, 0%) ou 0 0% 0%)
  const hslRegex = /^(hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)|\d+\s+\d+%\s+\d+%)$/;
  
  return hexRegex.test(color.trim()) || hslRegex.test(color.trim());
};

// Charger un modèle PDF avec isolation par entreprise
export const loadPDFModel = async (templateId: string = 'default'): Promise<PDFModel | null> => {
  try {
    const supabase = getSupabaseClient();
    
    // Récupérer le company_id de l'utilisateur actuel
    const companyId = await getCurrentCompanyId();
    if (!companyId) {
      console.error('Impossible de récupérer l\'ID de l\'entreprise');
      return null;
    }
    
    console.log(`Chargement du modèle PDF ${templateId} pour l'entreprise ${companyId}`);
    
    let data, error;
    
    // Si c'est 'default', chercher le template par défaut de l'entreprise
    if (templateId === 'default') {
      const { data: defaultData, error: defaultError } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_default', true)
        .limit(1)
        .maybeSingle();
      
      data = defaultData;
      error = defaultError;
      
      // Si pas de template par défaut trouvé, prendre le premier disponible
      if (!data) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('pdf_templates')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        
        data = fallbackData;
        error = fallbackError;
      }
    } else {
      // Chercher un modèle spécifique par ID
      const { data: specificData, error: specificError } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('company_id', companyId)
        .eq('id', templateId)
        .maybeSingle();
      
      data = specificData;
      error = specificError;
    }
    
    if (error) {
      console.error('Erreur lors du chargement du modèle:', error);
      return null;
    }
    
    if (!data) {
      console.log(`Aucun modèle trouvé pour l'entreprise ${companyId}, création d'un modèle par défaut`);
      
      // Récupérer les données de customisation de l'entreprise
      const { data: customizationData } = await supabase
        .from('company_customizations')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();
      
      const { data: companyData } = await supabase
        .from('companies')
        .select('name, primary_color, secondary_color')
        .eq('id', companyId)
        .maybeSingle();
      
      // Créer un modèle par défaut avec les données de l'entreprise
      const defaultModel: PDFModel = {
        ...DEFAULT_MODEL_TEMPLATE,
        id: `default-${companyId}`,
        company_id: companyId,
        companyName: customizationData?.company_name || companyData?.name || 'Votre Entreprise',
        companyAddress: customizationData?.company_address || 'Adresse à renseigner',
        companyContact: customizationData?.company_email || customizationData?.company_phone || 'contact@votre-entreprise.com',
        companySiret: 'SIRET à renseigner',
        primaryColor: customizationData?.primary_color || companyData?.primary_color || '#3b82f6',
        secondaryColor: customizationData?.secondary_color || companyData?.secondary_color || '#64748b',
        logoURL: customizationData?.logo_url || '',
        headerText: 'Offre de Leasing',
        footerText: 'Merci de votre confiance'
      };
      
      // Sauvegarder automatiquement ce modèle par défaut dans la base
      try {
        await savePDFModel(defaultModel);
        console.log('Modèle par défaut sauvegardé pour l\'entreprise:', companyId);
      } catch (saveError) {
        console.warn('Impossible de sauvegarder le modèle par défaut:', saveError);
      }
      
      return defaultModel;
    }
    
    console.log('Modèle chargé avec succès:', data.name);
    
    // Charger les images séparément
    const templateImages = await pdfModelImageService.loadImages(data.id);
    
    // Convertir les données pdf_templates vers le format PDFModel
    const sanitizedData: PDFModel = {
      id: data.id,
      name: data.name,
      companyName: data.companyName,
      companyAddress: data.companyAddress,
      companyContact: data.companyContact,
      companySiret: data.companySiret,
      logoURL: data.logoURL || '',
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      headerText: data.headerText,
      footerText: data.footerText,
      templateImages: data.templateImages || templateImages || [],
      fields: Array.isArray(data.fields) ? data.fields : [],
      company_id: data.company_id,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
    
    return sanitizedData;
  } catch (error) {
    console.error('Erreur lors du chargement du modèle PDF:', error);
    return null;
  }
};

// Sauvegarder un modèle PDF avec isolation par entreprise
export const savePDFModel = async (model: PDFModel): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    
    // S'assurer que company_id est défini
    if (!model.company_id) {
      const companyId = await getCurrentCompanyId();
      if (!companyId) {
        throw new Error('Impossible de récupérer l\'ID de l\'entreprise');
      }
      model.company_id = companyId;
    }
    
    // Validation du modèle
    const validationErrors = validatePDFModel(model);
    if (validationErrors.length > 0) {
      throw new Error(`Erreurs de validation: ${validationErrors.join(', ')}`);
    }
    
    console.log(`Sauvegarde du modèle PDF ${model.id} pour l'entreprise ${model.company_id}`);
    
    // Préparer les données pour la sauvegarde en format pdf_templates
    const modelData = {
      id: model.id,
      name: model.name,
      companyName: model.companyName,
      companyAddress: model.companyAddress,
      companyContact: model.companyContact,
      companySiret: model.companySiret,
      logoURL: model.logoURL || '',
      primaryColor: model.primaryColor,
      secondaryColor: model.secondaryColor,
      headerText: model.headerText,
      footerText: model.footerText,
      fields: model.fields || [],
      templateImages: model.templateImages || [],
      company_id: model.company_id,
      template_type: 'standard',
      is_active: true,
      is_default: model.id.includes('default'),
      updated_at: new Date().toISOString()
    };
    
    // Upsert avec vérification de l'entreprise
    const { error } = await supabase
      .from('pdf_templates')
      .upsert(modelData, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      throw new Error(`Erreur lors de la sauvegarde: ${error.message}`);
    }
    
    // Sauvegarder les images séparément
    if (Array.isArray(model.templateImages) && model.templateImages.length > 0) {
      console.log(`Sauvegarde de ${model.templateImages.length} images...`);
      await pdfModelImageService.saveImages(model.id, model.templateImages);
    }
    
    console.log('Modèle sauvegardé avec succès');
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du modèle PDF:', error);
    throw error;
  }
};

// Créer le modèle par défaut pour une entreprise
export const DEFAULT_MODEL: PDFModel = {
  id: 'default',
  name: 'Modèle par défaut',
  companyName: 'iTakeCare',
  companyAddress: 'Avenue du Général Michel 1E, 6000 Charleroi, Belgique',
  companyContact: 'Tel: +32 471 511 121 - Email: hello@itakecare.be',
  companySiret: 'TVA: BE 0795.642.894',
  logoURL: '',
  primaryColor: '#2C3E50',
  secondaryColor: '#3498DB',
  headerText: 'OFFRE N° {offer_id}',
  footerText: 'Cette offre est valable 30 jours à compter de sa date d\'émission.',
  templateImages: [],
  fields: [],
  company_id: 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0', // iTakecare company ID
};

/**
 * Récupère tous les modèles PDF pour l'entreprise actuelle
 */
export const getAllPDFModels = async () => {
  try {
    console.log("Récupération de tous les modèles PDF");
    const supabase = getSupabaseClient();
    
    // Récupérer le company_id de l'utilisateur actuel
    const companyId = await getCurrentCompanyId();
    if (!companyId) {
      console.error('Impossible de récupérer l\'ID de l\'entreprise');
      return [];
    }
    
    // Récupérer tous les modèles de cette entreprise
    const { data, error } = await supabase
      .from('pdf_templates')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error("Erreur lors de la récupération des modèles:", error);
      throw new Error(`Erreur lors de la récupération des modèles: ${error.message}`);
    }
    
    console.log(`${data?.length || 0} modèles récupérés pour l'entreprise ${companyId}`);
    return data || [];
  } catch (error: any) {
    console.error("Exception lors de la récupération des modèles:", error);
    throw error;
  }
};