
import { getSupabaseClient, getAdminSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ensureBucket } from "@/services/fileStorage";

/**
 * Vérifie si la table pdf_templates existe et la crée si nécessaire
 */
export const ensurePDFTemplateTableExists = async (): Promise<boolean> => {
  try {
    console.log("Vérification/création de la table pdf_templates...");
    const supabase = getSupabaseClient();
    const adminClient = getAdminSupabaseClient();
    
    // Essai direct de création de la table avec le client admin
    try {
      const { error } = await adminClient.rpc('execute_sql', {
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
            "templateImages" JSONB DEFAULT '[]'::jsonb,
            fields JSONB NOT NULL DEFAULT '[]'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );
        `
      });
      
      if (error) {
        console.error("Erreur lors de la création de la table avec admin:", error);
        throw error;
      }
      
      console.log("Table pdf_templates créée/vérifiée avec succès via admin");
    } catch (adminError) {
      console.error("Erreur avec client admin:", adminError);
      
      // Si l'approche admin échoue, essayer l'approche standard
      try {
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
              "templateImages" JSONB DEFAULT '[]'::jsonb,
              fields JSONB NOT NULL DEFAULT '[]'::jsonb,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
            );
          `
        });
        
        if (error) {
          console.error("Erreur lors de la création de la table:", error);
          throw error;
        }
        
        console.log("Table pdf_templates créée/vérifiée avec succès");
      } catch (directError) {
        console.error("Échec complet lors de la création de la table:", directError);
        return false;
      }
    }
    
    // S'assurer que le bucket de stockage existe aussi
    try {
      await ensureBucket('pdf-templates');
    } catch (bucketError) {
      console.warn("Impossible de créer le bucket, mais on continue car on utilise le stockage base64:", bucketError);
    }
    
    return true;
  } catch (error) {
    console.error("Exception lors de la vérification/création de la table:", error);
    return false;
  }
};

// Modèle par défaut
export const DEFAULT_TEMPLATE = {
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
 * Charge un modèle PDF depuis la base de données
 */
export const loadPDFTemplate = async (id: string = 'default') => {
  try {
    console.log("Début du chargement du modèle PDF:", id);
    
    // S'assurer que la table existe
    const tableExists = await ensurePDFTemplateTableExists();
    if (!tableExists) {
      console.error("La table pdf_templates n'a pas pu être créée/vérifiée");
      return DEFAULT_TEMPLATE;
    }
    
    // Essayer avec le client admin d'abord
    const adminClient = getAdminSupabaseClient();
    let data;
    let error;
    
    try {
      const result = await adminClient
        .from('pdf_templates')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      data = result.data;
      error = result.error;
    } catch (adminError) {
      console.error("Erreur avec client admin:", adminError);
      
      // Essayer avec le client standard
      const supabase = getSupabaseClient();
      const result = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      data = result.data;
      error = result.error;
    }
    
    if (error) {
      console.error("Erreur lors du chargement du modèle:", error);
      return DEFAULT_TEMPLATE;
    }
    
    if (!data) {
      console.log("Aucun modèle trouvé, insertion du modèle par défaut");
      await savePDFTemplate(DEFAULT_TEMPLATE);
      return DEFAULT_TEMPLATE;
    }
    
    // S'assurer que les champs importants sont initialisés
    const template = {
      ...data,
      templateImages: data.templateImages || [],
      fields: data.fields || []
    };
    
    console.log("Modèle chargé:", template);
    console.log("Nombre d'images:", template.templateImages.length);
    console.log("Nombre de champs:", template.fields.length);
    
    return template;
  } catch (error) {
    console.error("Exception lors du chargement du modèle:", error);
    return DEFAULT_TEMPLATE;
  }
};

/**
 * Sauvegarde un modèle PDF dans la base de données
 */
export const savePDFTemplate = async (template: any) => {
  try {
    console.log("Début de la sauvegarde du modèle PDF:", template.id);
    
    // S'assurer que la table existe
    const tableExists = await ensurePDFTemplateTableExists();
    if (!tableExists) {
      console.error("La table pdf_templates n'a pas pu être créée/vérifiée");
      throw new Error("Impossible de créer/vérifier la table pdf_templates");
    }
    
    // Préparer le modèle à sauvegarder en s'assurant que les tableaux sont initialisés
    const templateToSave = {
      ...template,
      templateImages: template.templateImages || [],
      fields: template.fields || [],
      updated_at: new Date().toISOString()
    };
    
    console.log("Modèle à sauvegarder:", templateToSave);
    console.log("Nombre d'images à sauvegarder:", templateToSave.templateImages.length);
    console.log("Nombre de champs à sauvegarder:", templateToSave.fields.length);
    
    // Essayer avec le client admin d'abord
    const adminClient = getAdminSupabaseClient();
    let error;
    
    try {
      const result = await adminClient
        .from('pdf_templates')
        .upsert(templateToSave, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });
      
      error = result.error;
    } catch (adminError) {
      console.error("Erreur avec client admin:", adminError);
      
      // Essayer avec le client standard
      const supabase = getSupabaseClient();
      const result = await supabase
        .from('pdf_templates')
        .upsert(templateToSave, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });
      
      error = result.error;
    }
    
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
    
    // S'assurer que la table existe
    const tableExists = await ensurePDFTemplateTableExists();
    if (!tableExists) {
      console.error("La table pdf_templates n'a pas pu être créée/vérifiée");
      return [];
    }
    
    // Essayer avec le client admin d'abord
    const adminClient = getAdminSupabaseClient();
    let data;
    let error;
    
    try {
      const result = await adminClient
        .from('pdf_templates')
        .select('*')
        .order('name');
      
      data = result.data;
      error = result.error;
    } catch (adminError) {
      console.error("Erreur avec client admin:", adminError);
      
      // Essayer avec le client standard
      const supabase = getSupabaseClient();
      const result = await supabase
        .from('pdf_templates')
        .select('*')
        .order('name');
      
      data = result.data;
      error = result.error;
    }
    
    if (error) {
      console.error("Erreur lors de la récupération des modèles:", error);
      return [];
    }
    
    console.log(`${data?.length || 0} modèles récupérés`);
    return data || [];
  } catch (error) {
    console.error("Exception lors de la récupération des modèles:", error);
    return [];
  }
};
