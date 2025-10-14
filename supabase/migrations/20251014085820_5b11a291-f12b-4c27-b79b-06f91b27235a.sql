-- Drop existing policy if exists
DROP POLICY IF EXISTS "pdf_templates_company_access" ON public.pdf_templates;

-- Recreate the policy
CREATE POLICY "pdf_templates_company_access" ON public.pdf_templates
  FOR ALL 
  USING (company_id = get_user_company_id() OR is_admin_optimized())
  WITH CHECK (company_id = get_user_company_id() OR is_admin_optimized());

-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdf-templates-assets', 'pdf-templates-assets', true)
ON CONFLICT (id) DO NOTHING;