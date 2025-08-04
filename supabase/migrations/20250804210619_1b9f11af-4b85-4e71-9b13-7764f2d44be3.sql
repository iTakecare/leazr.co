-- Nettoyer toutes les politiques RLS existantes sur pdf_templates
DROP POLICY IF EXISTS "Admin manage pdf_templates" ON public.pdf_templates;
DROP POLICY IF EXISTS "Public read pdf_templates" ON public.pdf_templates;
DROP POLICY IF EXISTS "pdf_templates_admin" ON public.pdf_templates;
DROP POLICY IF EXISTS "pdf_templates_admin_write" ON public.pdf_templates;
DROP POLICY IF EXISTS "pdf_templates_read_all" ON public.pdf_templates;
DROP POLICY IF EXISTS "pdf_templates_secure_access" ON public.pdf_templates;

-- Créer une politique RLS simple et fonctionnelle
CREATE POLICY "pdf_templates_company_access" 
ON public.pdf_templates 
FOR ALL 
USING (
  (get_user_company_id() IS NOT NULL) AND 
  (company_id = get_user_company_id() OR get_user_company_id() = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'::uuid)
)
WITH CHECK (
  (get_user_company_id() IS NOT NULL) AND 
  (company_id = get_user_company_id() OR get_user_company_id() = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'::uuid)
);