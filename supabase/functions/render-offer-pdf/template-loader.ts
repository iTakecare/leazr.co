import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function loadTemplate(
  supabase: SupabaseClient, 
  templateSlug: string, 
  companyId: string
) {
  // First try to load from database
  const { data: template, error } = await supabase
    .from('pdf_template_versions')
    .select('*')
    .eq('template_slug', templateSlug)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Error loading template: ${error.message}`);
  }

  if (!template) {
    throw new Error(`Template ${templateSlug} not found for company ${companyId}`);
  }

  // If html_content is a placeholder, load from file
  if (template.html_content.includes('<!-- Template chargé depuis le fichier externe -->')) {
    try {
      const fileUrl = new URL(`./templates/${templateSlug}.html`, import.meta.url);
      const htmlContent = await Deno.readTextFile(fileUrl);
      template.html_content = htmlContent;
    } catch (fileError) {
      console.error('Error loading template file:', fileError);
      throw new Error(`Template file ${templateSlug}.html not found`);
    }
  }

  return template;
}
