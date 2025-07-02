-- Vérifier si la table company_modules existe et corriger les politiques

-- Supprimer toutes les politiques existantes sur company_modules
DROP POLICY IF EXISTS "company_modules_access" ON public.company_modules;
DROP POLICY IF EXISTS "company_modules_admin_access" ON public.company_modules;
DROP POLICY IF EXISTS "company_modules_company_access" ON public.company_modules;

-- Créer une politique simple et sécurisée pour company_modules
CREATE POLICY "company_modules_unified" 
ON public.company_modules 
FOR ALL 
USING (
  company_id = get_user_company_id() OR is_admin_optimized()
);

-- Supprimer toutes les politiques existantes sur collaborators
DROP POLICY IF EXISTS "collaborators_company_access" ON public.collaborators;
DROP POLICY IF EXISTS "collaborators_unified_access" ON public.collaborators;
DROP POLICY IF EXISTS "clients_can_view_own_collaborators" ON public.collaborators;

-- Créer une politique sécurisée pour collaborators
CREATE POLICY "collaborators_secure_access" 
ON public.collaborators 
FOR ALL 
USING (
  client_id IN (
    SELECT id FROM public.clients 
    WHERE company_id = get_user_company_id() OR user_id = auth.uid()
  ) OR is_admin_optimized()
) 
WITH CHECK (
  client_id IN (
    SELECT id FROM public.clients 
    WHERE company_id = get_user_company_id() OR user_id = auth.uid()
  ) OR is_admin_optimized()
);