
-- Corriger les politiques RLS pour la table leasers
DROP POLICY IF EXISTS "leasers_access" ON public.leasers;

-- Permettre l'accès en lecture à tous les utilisateurs authentifiés
CREATE POLICY "leasers_read_access" ON public.leasers
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Permettre l'accès en écriture aux admins
CREATE POLICY "leasers_admin_write" ON public.leasers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Ajouter les colonnes manquantes à la table companies pour le branding
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#3B82F6',
ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#1E40AF',
ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#F59E0B',
ADD COLUMN IF NOT EXISTS favicon_url text,
ADD COLUMN IF NOT EXISTS custom_domain text;

-- Corriger les politiques RLS pour la table companies
DROP POLICY IF EXISTS "companies_admin_access" ON public.companies;

-- Permettre l'accès en lecture à tous les utilisateurs authentifiés de la même entreprise
CREATE POLICY "companies_read_access" ON public.companies
FOR SELECT USING (
  id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Permettre l'accès complet aux admins
CREATE POLICY "companies_admin_access" ON public.companies
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);
