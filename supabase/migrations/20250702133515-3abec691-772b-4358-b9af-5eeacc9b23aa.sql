-- Corriger les politiques RLS qui référencent directement auth.users

-- Supprimer les politiques problématiques sur company_modules
DROP POLICY IF EXISTS "company_modules_admin_access" ON public.company_modules;
DROP POLICY IF EXISTS "company_modules_company_access" ON public.company_modules;

-- Créer de nouvelles politiques pour company_modules utilisant des fonctions security definer
CREATE POLICY "company_modules_access" 
ON public.company_modules 
FOR ALL 
USING (
  company_id = get_user_company_id() OR is_admin_optimized()
);

-- Supprimer les politiques problématiques sur collaborators
DROP POLICY IF EXISTS "collaborators_company_access" ON public.collaborators;
DROP POLICY IF EXISTS "clients_can_view_own_collaborators" ON public.collaborators;

-- Créer une nouvelle politique pour collaborators
CREATE POLICY "collaborators_unified_access" 
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