-- Add RLS policies for custom_pdf_template_versions table
-- Fix the type mismatch issue with template_id

CREATE POLICY "custom_pdf_template_versions_company_access" 
ON public.custom_pdf_template_versions 
FOR ALL 
USING (
  template_id::text IN (
    SELECT id FROM public.pdf_templates 
    WHERE company_id = get_user_company_id()
  ) 
  OR is_admin_optimized()
)
WITH CHECK (
  template_id::text IN (
    SELECT id FROM public.pdf_templates 
    WHERE company_id = get_user_company_id()
  ) 
  OR is_admin_optimized()
);