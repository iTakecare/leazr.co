-- Supprimer toutes les politiques RLS existantes sur la table offers
DROP POLICY IF EXISTS "offers_secure_access" ON public.offers;
DROP POLICY IF EXISTS "offers_company_isolation" ON public.offers;
DROP POLICY IF EXISTS "offers_admin_access" ON public.offers;
DROP POLICY IF EXISTS "offers_ambassador_access" ON public.offers;
DROP POLICY IF EXISTS "offers_partner_access" ON public.offers;
DROP POLICY IF EXISTS "offers_client_access" ON public.offers;
DROP POLICY IF EXISTS "offers_upload_token_access" ON public.offers;
DROP POLICY IF EXISTS "offers_public_upload_token_access" ON public.offers;
DROP POLICY IF EXISTS "offers_catalog_api_only" ON public.offers;

-- Créer une politique RLS simple et unifiée
CREATE POLICY "offers_unified_access" ON public.offers
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
  OR
  -- Accès via token d'upload pour catalogue public
  (company_id IN (
    SELECT DISTINCT o.company_id 
    FROM offers o
    JOIN offer_upload_links oul ON o.id = oul.offer_id
    WHERE oul.expires_at > now() AND oul.used_at IS NULL
  ))
)
WITH CHECK (
  -- Insertion/modification : même entreprise ou admin
  (auth.uid() IS NOT NULL AND company_id = get_user_company_id_secure()) 
  OR 
  is_admin_optimized()
);