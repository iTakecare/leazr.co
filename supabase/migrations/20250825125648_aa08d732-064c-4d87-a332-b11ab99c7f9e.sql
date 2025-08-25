-- Corriger la récursion infinie dans les politiques RLS de la table offers

-- Supprimer la politique problématique
DROP POLICY IF EXISTS "offers_unified_access" ON public.offers;

-- Créer une fonction security definer pour éviter la récursion
CREATE OR REPLACE FUNCTION public.get_companies_with_active_upload_tokens()
RETURNS TABLE(company_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT DISTINCT oul.offer_id as company_id
  FROM offer_upload_links oul
  WHERE oul.expires_at > now() 
    AND oul.used_at IS NULL;
$$;

-- Créer une politique RLS simplifiée sans récursion
CREATE POLICY "offers_secure_access_fixed" ON public.offers
FOR ALL USING (
  -- Utilisateurs authentifiés de la même entreprise
  (auth.uid() IS NOT NULL AND company_id = get_user_company_id_secure()) 
  OR 
  -- Administrateurs système
  is_admin_optimized() 
  OR 
  -- Clients ayant accès à leurs propres offres
  (auth.uid() IS NOT NULL AND client_id IN (
    SELECT c.id FROM clients c WHERE c.user_id = auth.uid()
  ))
)
WITH CHECK (
  -- Insertion/modification : même entreprise ou admin
  (auth.uid() IS NOT NULL AND company_id = get_user_company_id_secure()) 
  OR 
  is_admin_optimized()
);