-- Corriger l'accès à la table companies pour les administrateurs

-- Politique pour la table companies - permettre l'accès aux admins
DROP POLICY IF EXISTS "companies_access" ON public.companies;

CREATE POLICY "companies_admin_access" ON public.companies
FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- S'assurer que RLS est activé sur la table companies  
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;