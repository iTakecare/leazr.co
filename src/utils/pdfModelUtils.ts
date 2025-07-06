import { getSupabaseClient } from "@/integrations/supabase/client";

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
  templateImages: any[];
  fields: any[];
  created_at?: string;
  updated_at?: string;
}

// Validation des champs obligatoires
const validatePDFModel = (model: Partial<PDFModel>): string[] => {
  const errors: string[] = [];
  const requiredFields = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'nom du modèle' },
    { key: 'companyName', label: 'nom de l\'entreprise' },
    { key: 'companyAddress', label: 'adresse de l\'entreprise' },
    { key: 'companyContact', label: 'contact de l\'entreprise' },
    { key: 'companySiret', label: 'SIRET de l\'entreprise' },
    { key: 'primaryColor', label: 'couleur primaire' },
    { key: 'secondaryColor', label: 'couleur secondaire' },
    { key: 'headerText', label: 'texte d\'en-tête' },
    { key: 'footerText', label: 'texte de pied de page' }
  ];
  
  for (const field of requiredFields) {
    const value = model[field.key as keyof PDFModel];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors.push(`Le champ '${field.label}' est obligatoire`);
      console.error(`VALIDATION DÉBOGAGE: Champ manquant - ${field.label}:`, value);
    }
  }
  
  // Validation des couleurs (format HSL ou HEX)
  if (model.primaryColor && !isValidColor(model.primaryColor)) {
    errors.push('La couleur primaire doit être au format HSL ou HEX valide');
  }
  
  if (model.secondaryColor && !isValidColor(model.secondaryColor)) {
    errors.push('La couleur secondaire doit être au format HSL ou HEX valide');
  }
  
  console.log("VALIDATION DÉBOGAGE: Résultat de la validation:", {
    errorsCount: errors.length,
    errors: errors,
    modelKeys: Object.keys(model),
    modelSample: {
      id: model.id,
      name: model.name,
      companyName: model.companyName,
      companyAddress: model.companyAddress
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

// Modèle par défaut
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
  fields: []
};

/**
 * Assure que le modèle par défaut existe dans la base de données
 */
export const ensureDefaultModel = async (): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    
    // Vérifier si le modèle par défaut existe déjà
    const { data: existingModel } = await supabase
      .from('pdf_models')
      .select('id')
      .eq('id', 'default')
      .maybeSingle();
    
    // S'il n'existe pas, l'insérer
    if (!existingModel) {
      const { error } = await supabase
        .from('pdf_models')
        .insert(DEFAULT_MODEL);
      
      if (error) {
        console.error("Erreur lors de la création du modèle par défaut:", error);
      } else {
        console.log("Modèle par défaut créé avec succès");
      }
    }
  } catch (error) {
    console.error("Erreur lors de la vérification du modèle par défaut:", error);
  }
};

/**
 * Charge un modèle PDF depuis la base de données
 */
export const loadPDFModel = async (id: string = 'default') => {
  try {
    console.log("Chargement du modèle PDF:", id);
    const supabase = getSupabaseClient();
    
    // Assurer que le modèle par défaut existe
    await ensureDefaultModel();
    
    // Récupérer le modèle
    const { data, error } = await supabase
      .from('pdf_models')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) {
      console.error("Erreur lors du chargement du modèle:", error);
      throw new Error(`Erreur lors du chargement du modèle: ${error.message}`);
    }
    
    // Si aucun modèle n'est trouvé, retourner le modèle par défaut
    if (!data) {
      console.log("Modèle non trouvé, utilisation du modèle par défaut");
      return DEFAULT_MODEL;
    }
    
    console.log("Modèle chargé avec succès");
    return data;
  } catch (error: any) {
    console.error("Exception lors du chargement du modèle:", error);
    throw error;
  }
};

/**
 * Sauvegarde un modèle PDF dans la base de données
 */
export const savePDFModel = async (model: PDFModel) => {
  try {
    console.log("Début de la sauvegarde du modèle PDF:", model.id);
    
    // Valider le modèle avant sauvegarde
    const validationErrors = validatePDFModel(model);
    if (validationErrors.length > 0) {
      throw new Error(`Données invalides: ${validationErrors.join(', ')}`);
    }
    
    const supabase = getSupabaseClient();
    
    // Préparer les données à sauvegarder avec nettoyage
    const modelToSave = {
      id: model.id.trim(),
      name: model.name.trim(),
      companyName: model.companyName.trim(),
      companyAddress: model.companyAddress.trim(),
      companyContact: model.companyContact.trim(),
      companySiret: model.companySiret.trim(),
      logoURL: model.logoURL || '',
      primaryColor: model.primaryColor.trim(),
      secondaryColor: model.secondaryColor.trim(),
      headerText: model.headerText.trim(),
      footerText: model.footerText.trim(),
      templateImages: Array.isArray(model.templateImages) ? model.templateImages : [],
      fields: Array.isArray(model.fields) ? model.fields : [],
      updated_at: new Date().toISOString()
    };
    
    console.log("Données à sauvegarder:", modelToSave);
    
    // Sauvegarder le modèle
    const { data, error } = await supabase
      .from('pdf_models')
      .upsert(modelToSave, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select();
    
    if (error) {
      console.error("Erreur Supabase lors de la sauvegarde:", error);
      throw new Error(`Erreur de sauvegarde: ${error.message || error.details || 'Erreur inconnue'}`);
    }
    
    console.log("Modèle sauvegardé avec succès:", data);
    return true;
  } catch (error: any) {
    console.error("Exception lors de la sauvegarde du modèle:", error);
    throw new Error(`Sauvegarde échouée: ${error.message || 'Erreur inconnue'}`);
  }
};

/**
 * Récupère tous les modèles PDF
 */
export const getAllPDFModels = async () => {
  try {
    console.log("Récupération de tous les modèles PDF");
    const supabase = getSupabaseClient();
    
    // Récupérer tous les modèles
    const { data, error } = await supabase
      .from('pdf_models')
      .select('*')
      .order('name');
    
    if (error) {
      console.error("Erreur lors de la récupération des modèles:", error);
      throw new Error(`Erreur lors de la récupération des modèles: ${error.message}`);
    }
    
    console.log(`${data?.length || 0} modèles récupérés`);
    return data || [];
  } catch (error: any) {
    console.error("Exception lors de la récupération des modèles:", error);
    throw error;
  }
};
