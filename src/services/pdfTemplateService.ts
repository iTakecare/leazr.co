
import { supabase } from "@/integrations/supabase/client";

export interface PDFTemplate {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
  companyAddress: string;
  companySiret: string;
  companyContact: string;
  headerText: string;
  footerText: string;
  logoURL?: string;
  fields: Record<string, any>;
  templateImages?: any[];
}

export const getPDFTemplates = async (): Promise<PDFTemplate[]> => {
  try {
    const { data, error } = await supabase
      .from("pdf_templates")
      .select("*")
      .order("name");

    if (error) throw error;
    
    // Ensure all fields have isVisible set to true
    if (data) {
      data.forEach(template => {
        if (template.fields && Array.isArray(template.fields)) {
          template.fields = template.fields.map(field => ({
            ...field,
            isVisible: true
          }));
        }
      });
    }
    
    return data || [];
  } catch (error) {
    console.error("Error fetching PDF templates:", error);
    throw error;
  }
};

export const getPDFTemplateById = async (id: string): Promise<PDFTemplate | null> => {
  try {
    const { data, error } = await supabase
      .from("pdf_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    
    // Ensure all fields have isVisible set to true
    if (data && data.fields && Array.isArray(data.fields)) {
      data.fields = data.fields.map(field => ({
        ...field,
        isVisible: true
      }));
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching PDF template with ID ${id}:`, error);
    return null;
  }
};

/**
 * Assigns a PDF template to an ambassador
 * @param ambassadorId - ID of the ambassador
 * @param templateId - ID of the template to assign (or empty string for default)
 * @returns Promise<boolean> - Success status
 */
export const assignTemplateToAmbassador = async (
  ambassadorId: string, 
  templateId: string
): Promise<boolean> => {
  try {
    console.log(`[assignTemplateToAmbassador] Assigning template ${templateId} to ambassador ${ambassadorId}`);
    
    // If 'default' or empty string, set to null in database
    const templateIdValue = templateId === '' || templateId === 'default' ? null : templateId;
    
    const { error } = await supabase
      .from("ambassadors")
      .update({ pdf_template_id: templateIdValue })
      .eq("id", ambassadorId);
      
    if (error) {
      console.error(`[assignTemplateToAmbassador] Error:`, error);
      throw error;
    }
    
    console.log(`[assignTemplateToAmbassador] Success`);
    return true;
  } catch (error) {
    console.error(`[assignTemplateToAmbassador] Critical error:`, error);
    return false;
  }
};

/**
 * Assigns a PDF template to a partner
 * @param partnerId - ID of the partner
 * @param templateId - ID of the template to assign (or empty string for default)
 * @returns Promise<boolean> - Success status
 */
export const assignTemplateToPartner = async (
  partnerId: string, 
  templateId: string
): Promise<boolean> => {
  try {
    console.log(`[assignTemplateToPartner] Assigning template ${templateId} to partner ${partnerId}`);
    
    // If 'default' or empty string, set to null in database
    const templateIdValue = templateId === '' || templateId === 'default' ? null : templateId;
    
    const { error } = await supabase
      .from("partners")
      .update({ pdf_template_id: templateIdValue })
      .eq("id", partnerId);
      
    if (error) {
      console.error(`[assignTemplateToPartner] Error:`, error);
      throw error;
    }
    
    console.log(`[assignTemplateToPartner] Success`);
    return true;
  } catch (error) {
    console.error(`[assignTemplateToPartner] Critical error:`, error);
    return false;
  }
};

/**
 * Creates a new PDF template
 * @param templateData - Template data to create
 * @returns Promise<PDFTemplate> - The created template
 */
export const createPDFTemplate = async (templateData: Partial<PDFTemplate>): Promise<PDFTemplate> => {
  try {
    const templateId = `template_${Date.now()}`;
    const newTemplate = {
      id: templateId,
      name: templateData.name || 'New Template',
      primaryColor: templateData.primaryColor || '#2C3E50',
      secondaryColor: templateData.secondaryColor || '#3498DB',
      companyName: templateData.companyName || 'Your Company',
      companyAddress: templateData.companyAddress || '123 Main St, City',
      companySiret: templateData.companySiret || '123 456 789 00001',
      companyContact: templateData.companyContact || 'contact@example.com',
      headerText: templateData.headerText || 'OFFER {offer_id}',
      footerText: templateData.footerText || 'This offer is valid for 30 days.',
      logoURL: templateData.logoURL || null,
      fields: templateData.fields || [],
      templateImages: templateData.templateImages || []
    };

    // Ensure all fields have isVisible set to true
    if (newTemplate.fields && Array.isArray(newTemplate.fields)) {
      newTemplate.fields = newTemplate.fields.map(field => ({
        ...field,
        isVisible: true
      }));
    }

    const { data, error } = await supabase
      .from('pdf_templates')
      .insert([newTemplate])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating PDF template:", error);
    throw error;
  }
};
