-- Add RLS policies for custom_pdf_template_versions table
-- This table has RLS enabled but no policies defined

CREATE POLICY "custom_pdf_template_versions_company_access" 
ON public.custom_pdf_template_versions 
FOR ALL 
USING (
  template_id IN (
    SELECT id FROM public.pdf_templates 
    WHERE company_id = get_user_company_id()
  ) 
  OR is_admin_optimized()
)
WITH CHECK (
  template_id IN (
    SELECT id FROM public.pdf_templates 
    WHERE company_id = get_user_company_id()
  ) 
  OR is_admin_optimized()
);