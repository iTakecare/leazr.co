
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateOfferPdf } from "@/utils/pdfGenerator";

export type PDFTemplate = {
  id: string;
  name: string;
  companyName: string;
  companyAddress: string;
  companyContact: string;
  companySiret: string;
  logoURL?: string;
  primaryColor: string;
  secondaryColor: string;
  headerText: string;
  footerText: string;
  templateImages?: any[];
  fields: any[];
  created_at?: string;
  updated_at?: string;
};

// Get all templates
export const getPDFTemplates = async (): Promise<PDFTemplate[]> => {
  try {
    // Use direct query instead of RPC to avoid table_name ambiguity
    const { data, error } = await supabase
      .from('pdf_templates')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching PDF templates:", error);
    toast.error("Erreur lors du chargement des modèles PDF");
    return [];
  }
};

// Get template by ID
export const getPDFTemplateById = async (id: string): Promise<PDFTemplate | null> => {
  try {
    const { data, error } = await supabase
      .from('pdf_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error fetching PDF template with ID ${id}:`, error);
    return null;
  }
};

// Create new template
export const createPDFTemplate = async (template: Omit<PDFTemplate, 'id'>): Promise<PDFTemplate | null> => {
  try {
    const { data, error } = await supabase
      .from('pdf_templates')
      .insert([template])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating PDF template:", error);
    toast.error("Erreur lors de la création du modèle PDF");
    return null;
  }
};

// Update existing template
export const updatePDFTemplate = async (id: string, template: Partial<PDFTemplate>): Promise<PDFTemplate | null> => {
  try {
    const { data, error } = await supabase
      .from('pdf_templates')
      .update(template)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error updating PDF template with ID ${id}:`, error);
    toast.error("Erreur lors de la mise à jour du modèle PDF");
    return null;
  }
};

// Delete template by ID
export const deletePDFTemplate = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('pdf_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error deleting PDF template with ID ${id}:`, error);
    toast.error("Erreur lors de la suppression du modèle PDF");
    return false;
  }
};

// Generate PDF with a specific template
export const generatePDFWithTemplate = async (template: PDFTemplate, offerData: any) => {
  try {
    const offerWithTemplate = {
      ...offerData,
      __template: template
    };
    
    return await generateOfferPdf(offerWithTemplate);
  } catch (error) {
    console.error("Error generating PDF with template:", error);
    toast.error("Erreur lors de la génération du PDF avec le modèle");
    throw error;
  }
};

// Assign template to partner
export const assignTemplateToPartner = async (partnerId: string, templateId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('partners')
      .update({ pdf_template_id: templateId })
      .eq('id', partnerId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error assigning template to partner:`, error);
    toast.error("Erreur lors de l'assignation du modèle");
    return false;
  }
};

// Assign template to ambassador
export const assignTemplateToAmbassador = async (ambassadorId: string, templateId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('ambassadors')
      .update({ pdf_template_id: templateId })
      .eq('id', ambassadorId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error assigning template to ambassador:`, error);
    toast.error("Erreur lors de l'assignation du modèle");
    return false;
  }
};
