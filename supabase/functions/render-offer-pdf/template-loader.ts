import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function loadTemplate(
  supabase: SupabaseClient, 
  templateSlug: string, 
  companyId: string
) {
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

  return template;
}
