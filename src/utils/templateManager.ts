
import { getSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ensureBucket } from "@/services/fileStorage";

// Type definitions for better type safety
export interface TemplateImage {
  id: string;
  name: string;
  data: string; // Base64 data
  page: number;
}

export interface TemplateField {
  id: string;
  label: string;
  type: string;
  category: string;
  isVisible: boolean;
  value: string;
  position: { x: number; y: number };
  page: number;
  style?: {
    fontSize: number;
    fontWeight: string;
    fontStyle: string;
    textDecoration: string;
  };
}

export interface PDFTemplate {
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
  templateImages: TemplateImage[];
  fields: TemplateField[];
  created_at?: string;
  updated_at?: string;
}

// Default template with empty arrays to avoid null values
export const DEFAULT_TEMPLATE: PDFTemplate = {
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
  templateImages: [], // Initialize as empty array
  fields: []  // Initialize as empty array
};

/**
 * Ensures the PDF templates table exists in the database
 */
export const ensurePDFTemplateTable = async (): Promise<boolean> => {
  try {
    console.log("Vérification de la table pdf_templates...");
    const supabase = getSupabaseClient();
    
    // Create table if not exists
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
          fields JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );
      `
    });
    
    if (error) {
      console.error("Erreur lors de la création de la table:", error);
      return false;
    }
    
    // Ensure storage bucket exists
    try {
      await ensureBucket('pdf-templates');
    } catch (e) {
      console.warn("Bucket non créé, mais on continue:", e);
    }
    
    return true;
  } catch (error) {
    console.error("Exception lors de la vérification de la table:", error);
    return false;
  }
};

/**
 * Loads a PDF template from the database
 */
export const loadTemplate = async (id: string = 'default'): Promise<PDFTemplate> => {
  try {
    console.log("Chargement du template:", id);
    
    // Ensure table exists
    const tableCreated = await ensurePDFTemplateTable();
    if (!tableCreated) {
      toast.error("Impossible de préparer la base de données");
      return { ...DEFAULT_TEMPLATE };
    }
    
    // Load template
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('pdf_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) {
      console.error("Erreur lors du chargement du template:", error);
      toast.error("Erreur lors du chargement du modèle");
      return { ...DEFAULT_TEMPLATE };
    }
    
    if (!data) {
      console.log("Template non trouvé, création du modèle par défaut");
      // Save default template
      await saveTemplate(DEFAULT_TEMPLATE);
      return { ...DEFAULT_TEMPLATE };
    }
    
    // Ensure arrays are properly initialized
    const template: PDFTemplate = {
      ...data,
      templateImages: Array.isArray(data.templateImages) ? data.templateImages : [],
      fields: Array.isArray(data.fields) ? data.fields : []
    };
    
    console.log("Template chargé:", template.name);
    console.log("Nombre d'images:", template.templateImages.length);
    console.log("Nombre de champs:", template.fields.length);
    
    return template;
  } catch (error) {
    console.error("Exception lors du chargement du template:", error);
    toast.error("Erreur lors du chargement du modèle");
    return { ...DEFAULT_TEMPLATE };
  }
};

/**
 * Saves a PDF template to the database
 */
export const saveTemplate = async (template: PDFTemplate): Promise<boolean> => {
  try {
    console.log("Sauvegarde du template:", template.id);
    
    // Ensure table exists
    const tableCreated = await ensurePDFTemplateTable();
    if (!tableCreated) {
      toast.error("Impossible de préparer la base de données");
      return false;
    }
    
    // Ensure arrays are properly initialized before saving
    const templateToSave: PDFTemplate = {
      ...template,
      templateImages: Array.isArray(template.templateImages) ? template.templateImages : [],
      fields: Array.isArray(template.fields) ? template.fields : [],
      updated_at: new Date().toISOString()
    };
    
    console.log("Nombre d'images à sauvegarder:", templateToSave.templateImages.length);
    console.log("Nombre de champs à sauvegarder:", templateToSave.fields.length);
    
    // Save template
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('pdf_templates')
      .upsert(templateToSave, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error("Erreur lors de la sauvegarde du template:", error);
      toast.error("Erreur lors de la sauvegarde du modèle");
      return false;
    }
    
    console.log("Template sauvegardé avec succès");
    return true;
  } catch (error) {
    console.error("Exception lors de la sauvegarde du template:", error);
    toast.error("Erreur lors de la sauvegarde du modèle");
    return false;
  }
};

/**
 * Lists all PDF templates
 */
export const listTemplates = async (): Promise<PDFTemplate[]> => {
  try {
    console.log("Récupération des templates");
    
    // Ensure table exists
    const tableCreated = await ensurePDFTemplateTable();
    if (!tableCreated) {
      toast.error("Impossible de préparer la base de données");
      return [];
    }
    
    // List templates
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('pdf_templates')
      .select('*')
      .order('name');
    
    if (error) {
      console.error("Erreur lors de la récupération des templates:", error);
      toast.error("Erreur lors de la récupération des modèles");
      return [];
    }
    
    // Ensure arrays are properly initialized
    const templates = (data || []).map(item => ({
      ...item,
      templateImages: Array.isArray(item.templateImages) ? item.templateImages : [],
      fields: Array.isArray(item.fields) ? item.fields : []
    }));
    
    console.log(`${templates.length} templates récupérés`);
    return templates;
  } catch (error) {
    console.error("Exception lors de la récupération des templates:", error);
    toast.error("Erreur lors de la récupération des modèles");
    return [];
  }
};
