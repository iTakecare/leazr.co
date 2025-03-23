
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
 * Vérifie et crée la table pdf_models si nécessaire
 */
export const ensurePDFModelTableExists = async (): Promise<boolean> => {
  const supabase = getSupabaseClient();
  
  try {
    console.log("Vérification et création de la table pdf_models si nécessaire...");
    
    // Exécuter directement une requête SQL pour créer la table si elle n'existe pas
    const { error } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.pdf_models (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          "companyName" TEXT NOT NULL,
          "companyAddress" TEXT NOT NULL,
          "companyContact" TEXT NOT NULL,
          "companySiret" TEXT NOT NULL,
          "logoURL" TEXT DEFAULT '',
          "primaryColor" TEXT NOT NULL,
          "secondaryColor" TEXT NOT NULL,
          "headerText" TEXT NOT NULL,
          "footerText" TEXT NOT NULL,
          "templateImages" JSONB DEFAULT '[]'::jsonb,
          fields JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );
      `
    });
    
    if (error) {
      console.error("Erreur lors de la création de la table:", error);
      throw new Error(`Erreur lors de la création de la table: ${error.message}`);
    }
    
    console.log("Table pdf_models vérifiée ou créée avec succès");
    
    // Vérifier s'il y a au moins un enregistrement, sinon insérer le modèle par défaut
    const { data: existingModels, error: checkError } = await supabase
      .from('pdf_models')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.error("Erreur lors de la vérification des modèles existants:", checkError);
      throw new Error(`Erreur lors de la vérification des modèles existants: ${checkError.message}`);
    }
    
    if (!existingModels || existingModels.length === 0) {
      console.log("Aucun modèle trouvé, insertion du modèle par défaut...");
      
      const { error: insertError } = await supabase
        .from('pdf_models')
        .insert(DEFAULT_MODEL);
      
      if (insertError) {
        console.error("Erreur lors de l'insertion du modèle par défaut:", insertError);
        throw new Error(`Erreur lors de l'insertion du modèle par défaut: ${insertError.message}`);
      }
      
      console.log("Modèle par défaut inséré avec succès");
    }
    
    return true;
  } catch (error: any) {
    console.error("Exception lors de la vérification/création de la table:", error);
    throw error;
  }
};

/**
 * Charge un modèle PDF depuis la base de données
 */
export const loadPDFModel = async (id: string = 'default') => {
  try {
    console.log("Début du chargement du modèle PDF:", id);
    const supabase = getSupabaseClient();
    
    // Assurez-vous que la table existe et contient au moins un modèle
    await ensurePDFModelTableExists();
    
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
    
    console.log("Réponse de la requête de chargement:", data ? "Modèle trouvé" : "Aucun modèle trouvé");
    
    // Si aucun modèle n'est trouvé, retourner le modèle par défaut
    if (!data) {
      return DEFAULT_MODEL;
    }
    
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
    const supabase = getSupabaseClient();
    
    // Assurez-vous que la table existe
    await ensurePDFModelTableExists();
    
    // Préparer le modèle à sauvegarder
    const modelToSave = {
      ...model,
      updated_at: new Date().toISOString()
    };
    
    // Sauvegarder le modèle
    const { error } = await supabase
      .from('pdf_models')
      .upsert(modelToSave, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error("Erreur lors de la sauvegarde du modèle:", error);
      throw new Error(`Erreur lors de la sauvegarde du modèle: ${error.message}`);
    }
    
    console.log("Modèle sauvegardé avec succès:", model.id);
    return true;
  } catch (error: any) {
    console.error("Exception lors de la sauvegarde du modèle:", error);
    throw error;
  }
};

/**
 * Récupère tous les modèles PDF
 */
export const getAllPDFModels = async () => {
  try {
    console.log("Récupération de tous les modèles PDF");
    const supabase = getSupabaseClient();
    
    // Assurez-vous que la table existe et contient au moins un modèle
    await ensurePDFModelTableExists();
    
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
