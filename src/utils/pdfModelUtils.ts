
import { getSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    console.log("Vérification de l'existence de la table pdf_models...");
    
    // Vérifier si la table existe avec une requête simple
    const { data, error } = await supabase
      .from('pdf_models')
      .select('id')
      .limit(1);
    
    // Si la requête échoue avec une erreur de type "relation does not exist", la table n'existe pas
    if (error && error.message.includes('relation "pdf_models" does not exist')) {
      console.log("Table pdf_models n'existe pas, création en cours...");
      
      // Créer la table
      const { error: createError } = await supabase.rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.pdf_models (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            "companyName" TEXT NOT NULL,
            "companyAddress" TEXT NOT NULL,
            "companyContact" TEXT NOT NULL,
            "companySiret" TEXT NOT NULL,
            "logoURL" TEXT,
            "primaryColor" TEXT NOT NULL,
            "secondaryColor" TEXT NOT NULL,
            "headerText" TEXT NOT NULL,
            "footerText" TEXT NOT NULL,
            "templateImages" JSONB,
            fields JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );
        `
      });
      
      if (createError) {
        console.error("Erreur lors de la création de la table:", createError);
        throw new Error("Erreur lors de la création de la table");
      }
      
      console.log("Table pdf_models créée avec succès");
      return true;
    } else if (error) {
      // Une autre erreur s'est produite
      console.error("Erreur lors de la vérification de la table:", error);
      throw error;
    }
    
    // Si aucune erreur, la table existe déjà
    console.log("Table pdf_models existe déjà");
    return true;
  } catch (error) {
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
    
    // Assurez-vous que la table existe
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
    return data;
  } catch (error) {
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
  } catch (error) {
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
    
    // Assurez-vous que la table existe
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
  } catch (error) {
    console.error("Exception lors de la récupération des modèles:", error);
    throw error;
  }
};
