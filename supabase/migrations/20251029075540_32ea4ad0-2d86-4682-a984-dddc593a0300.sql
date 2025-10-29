-- Supprimer toutes les politiques RLS existantes sur leasers
DROP POLICY IF EXISTS "leasers_company_access" ON public.leasers;
DROP POLICY IF EXISTS "leasers_company_isolation_secure" ON public.leasers;
DROP POLICY IF EXISTS "Leasers strict company isolation" ON public.leasers;
DROP POLICY IF EXISTS "leasers_complete_isolation" ON public.leasers;
DROP POLICY IF EXISTS "leasers_company_strict_isolation" ON public.leasers;
DROP POLICY IF EXISTS "leasers_catalog_api_only" ON public.leasers;
DROP POLICY IF EXISTS "leasers_public_upload_token_access" ON public.leasers;

-- Créer UNE SEULE politique RLS stricte pour l'isolation complète
CREATE POLICY "leasers_strict_company_isolation"
ON public.leasers
FOR ALL
USING (company_id = get_user_company_id())
WITH CHECK (company_id = get_user_company_id());