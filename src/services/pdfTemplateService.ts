
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
    return data;
  } catch (error) {
    console.error(`Error fetching PDF template with ID ${id}:`, error);
    return null;
  }
};
