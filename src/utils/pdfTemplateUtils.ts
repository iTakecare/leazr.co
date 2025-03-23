
import { getSupabaseClient } from "@/integrations/supabase/client";

/**
 * Vérifie si une table existe dans la base de données
 */
export const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    const supabase = getSupabaseClient();
    
    // Utiliser une requête SQL directe pour éviter les ambiguïtés de colonnes
    const { data, error } = await supabase.from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .maybeSingle();
    
    if (error) {
      console.error("Erreur lors de la vérification de table:", error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error("Exception lors de la vérification de table:", error);
    return false;
  }
};

/**
 * Crée la table pdf_templates si elle n'existe pas
 */
export const ensurePDFTemplateTableExists = async (): Promise<boolean> => {
  try {
    const supabase = getSupabaseClient();
    
    const tableExists = await checkTableExists('pdf_templates');
    
    if (!tableExists) {
      console.log("Table pdf_templates n'existe pas, création en cours...");
      
      const { error } = await supabase.rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.pdf_templates (
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
      
      if (error) {
        console.error("Erreur lors de la création de la table:", error);
        return false;
      }
      
      console.log("Table pdf_templates créée avec succès");
      return true;
    }
    
    console.log("Table pdf_templates existe déjà");
    return true;
  } catch (error) {
    console.error("Exception lors de la création de table:", error);
    return false;
  }
};

/**
 * Charge un modèle PDF depuis la base de données
 */
export const loadPDFTemplate = async (id: string = 'default') => {
  try {
    const supabase = getSupabaseClient();
    
    // Vérifier que la table existe
    await ensurePDFTemplateTableExists();
    
    // Récupérer le modèle
    const { data, error } = await supabase
      .from('pdf_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) {
      console.error("Erreur lors du chargement du modèle:", error);
      throw new Error("Erreur lors du chargement du modèle");
    }
    
    return data;
  } catch (error) {
    console.error("Exception lors du chargement du modèle:", error);
    throw error;
  }
};

/**
 * Sauvegarde un modèle PDF dans la base de données
 */
export const savePDFTemplate = async (template: any) => {
  try {
    const supabase = getSupabaseClient();
    
    // Vérifier que la table existe
    await ensurePDFTemplateTableExists();
    
    // Préparer le modèle à sauvegarder
    const templateToSave = {
      ...template,
      updated_at: new Date().toISOString()
    };
    
    // Sauvegarder le modèle
    const { error } = await supabase
      .from('pdf_templates')
      .upsert(templateToSave);
    
    if (error) {
      console.error("Erreur lors de la sauvegarde du modèle:", error);
      throw new Error("Erreur lors de la sauvegarde du modèle");
    }
    
    return true;
  } catch (error) {
    console.error("Erreur lors de la sauvegarde du modèle:", error);
    throw error;
  }
};
