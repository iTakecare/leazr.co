-- Supprimer les références client_id des templates PDF personnalisés
-- Les templates seront uniquement liés à company_id (un template global par entreprise)

-- 1. Supprimer la colonne client_id de custom_pdf_templates
ALTER TABLE public.custom_pdf_templates DROP COLUMN client_id;

-- 2. Modifier les tables liées pour s'assurer qu'elles fonctionnent sans client_id
-- Pas de modifications nécessaires pour les autres tables car elles font référence à template_id

-- 3. Mettre à jour les politiques RLS pour refléter le changement
DROP POLICY IF EXISTS "Templates access by company" ON public.custom_pdf_templates;

CREATE POLICY "Templates access by company" 
ON public.custom_pdf_templates 
FOR ALL 
USING ((company_id = get_user_company_id()) OR is_admin_optimized())
WITH CHECK ((company_id = get_user_company_id()) OR is_admin_optimized());