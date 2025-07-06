import { getSupabaseClient } from "@/integrations/supabase/client";
import { ensureStorageBucket } from "@/services/storageService";

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
 * Vérifie et crée la table pdf_models et le bucket de stockage si nécessaire
 */
export const ensurePDFModelTableExists = async (): Promise<boolean> => {
  const supabase = getSupabaseClient();
  
  try {
    console.log("Vérification de l'existence de la table pdf_models...");
    
    // 1. Vérifier si la table existe déjà via la fonction RPC
    const { data: tableExists, error: checkError } = await supabase.rpc(
      'check_table_exists',
      { table_name: 'pdf_models' }
    );
    
    if (checkError) {
      console.error("Erreur lors de la vérification de l'existence de la table:", checkError);
      
      // Fallback: création directe de la table via SQL
      const { error: createError } = await supabase.rpc('execute_sql', {
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
      
      if (createError) {
        console.error("Erreur lors de la création directe de la table:", createError);
        throw new Error(`Erreur lors de la création de la table: ${createError.message}`);
      }
      
      console.log("Table pdf_models créée avec succès via SQL direct");
    } else if (!tableExists) {
      console.log("La table pdf_models n'existe pas, création...");
      
      const { error: createError } = await supabase.rpc('execute_sql', {
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
      
      if (createError) {
        console.error("Erreur lors de la création de la table:", createError);
        throw new Error(`Erreur lors de la création de la table: ${createError.message}`);
      }
      
      console.log("Table pdf_models créée avec succès");
    } else {
      console.log("La table pdf_models existe déjà");
    }
    
    // Vérifier s'il y a au moins un enregistrement, sinon insérer le modèle par défaut
    try {
      const { count, error: countError } = await supabase
        .from('pdf_models')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error("Erreur lors du comptage des modèles:", countError);
        throw new Error(`Erreur lors du comptage des modèles: ${countError.message}`);
      }
      
      if (count === 0) {
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
    } catch (countError) {
      // Si on ne peut pas compter, on essaie d'insérer directement (en mode upsert)
      console.log("Erreur de comptage, tentative d'insertion du modèle par défaut...");
      
      const { error: insertError } = await supabase
        .from('pdf_models')
        .upsert(DEFAULT_MODEL, { onConflict: 'id' });
      
      if (insertError) {
        console.error("Erreur lors de l'insertion/mise à jour du modèle par défaut:", insertError);
      } else {
        console.log("Modèle par défaut inséré/mis à jour avec succès");
      }
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
