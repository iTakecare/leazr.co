
import { getSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Vérifie si la table pdf_templates existe et la crée si nécessaire
 */
export const ensurePDFTemplateTableExists = async (): Promise<boolean> => {
  try {
    console.log("Vérification de l'existence de la table pdf_templates...");
    const supabase = getSupabaseClient();
    
    // Vérifier si la table existe
    const { data: tablesData, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'pdf_templates')
      .maybeSingle();
    
    if (tablesError) {
      console.error("Erreur lors de la vérification de la table:", tablesError);
      throw new Error("Erreur lors de la vérification de la table");
    }
    
    // Si la table n'existe pas, la créer
    if (!tablesData) {
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
        throw new Error("Erreur lors de la création de la table");
      }
      
      console.log("Table pdf_templates créée avec succès");
    } else {
      console.log("Table pdf_templates existe déjà");
    }
    
    return true;
  } catch (error) {
    console.error("Exception lors de la vérification/création de la table:", error);
    throw error;
  }
};

/**
 * Charge un modèle PDF depuis la base de données
 */
export const loadPDFTemplate = async (id: string = 'default') => {
  try {
    console.log("Début du chargement du modèle PDF:", id);
    const supabase = getSupabaseClient();
    
    // Assurez-vous que la table existe
    await ensurePDFTemplateTableExists();
    
    // Récupérer le modèle
    const { data, error } = await supabase
      .from('pdf_templates')
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
export const savePDFTemplate = async (template: any) => {
  try {
    console.log("Début de la sauvegarde du modèle PDF:", template.id);
    const supabase = getSupabaseClient();
    
    // Assurez-vous que la table existe
    await ensurePDFTemplateTableExists();
    
    // Préparer le modèle à sauvegarder
    const templateToSave = {
      ...template,
      updated_at: new Date().toISOString()
    };
    
    // Sauvegarder le modèle
    const { error } = await supabase
      .from('pdf_templates')
      .upsert(templateToSave, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error("Erreur lors de la sauvegarde du modèle:", error);
      throw new Error(`Erreur lors de la sauvegarde du modèle: ${error.message}`);
    }
    
    console.log("Modèle sauvegardé avec succès:", template.id);
    return true;
  } catch (error) {
    console.error("Exception lors de la sauvegarde du modèle:", error);
    throw error;
  }
};

/**
 * Récupère tous les modèles PDF
 */
export const getAllPDFTemplates = async () => {
  try {
    console.log("Récupération de tous les modèles PDF");
    const supabase = getSupabaseClient();
    
    // Assurez-vous que la table existe
    await ensurePDFTemplateTableExists();
    
    // Récupérer tous les modèles
    const { data, error } = await supabase
      .from('pdf_templates')
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
