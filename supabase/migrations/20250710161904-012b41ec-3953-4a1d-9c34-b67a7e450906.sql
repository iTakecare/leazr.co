-- CORRECTION CRITIQUE DE L'ISOLATION DES DONNÉES ENTRE ENTREPRISES
-- Problème: Suppression complète de toutes les politiques existantes et recréation propre
-- Solution: Nettoyer complètement et recréer des politiques RLS strictes

-- Étape 1: Supprimer TOUTES les politiques existantes sur la table offers
DROP POLICY IF EXISTS "Admin full access to offers" ON public.offers;
DROP POLICY IF EXISTS "Company members can manage their offers" ON public.offers;
DROP POLICY IF EXISTS "Users can manage their own offers" ON public.offers;
DROP POLICY IF EXISTS "Ambassadors can manage their offers" ON public.offers;
DROP POLICY IF EXISTS "Public can view signed offers" ON public.offers;
DROP POLICY IF EXISTS "Allow public offer requests" ON public.offers;
DROP POLICY IF EXISTS "Offers strict company isolation" ON public.offers;
DROP POLICY IF EXISTS "offers_access" ON public.offers;
DROP POLICY IF EXISTS "offers_strict_company_isolation" ON public.offers;
DROP POLICY IF EXISTS "offers_user_ownership" ON public.offers;
DROP POLICY IF EXISTS "offers_ambassador_ownership" ON public.offers;
DROP POLICY IF EXISTS "offers_public_signed_read_only" ON public.offers;
DROP POLICY IF EXISTS "offers_public_client_requests" ON public.offers;

-- Étape 2: Créer des politiques RLS strictes et sécurisées

-- 1. Politique principale: Accès UNIQUEMENT aux offres de son entreprise
CREATE POLICY "offers_company_strict_isolation" 
ON public.offers 
FOR ALL 
USING (
  (get_user_company_id() IS NOT NULL) AND 
  (
    -- L'offre appartient à la même entreprise que l'utilisateur
    (company_id = get_user_company_id()) OR 
    -- Exception UNIQUEMENT pour les super admins iTakecare
    (
      is_admin_optimized() AND 
      get_current_user_email() LIKE '%@itakecare.be' AND 
      get_user_company_id() = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
    )
  )
)
WITH CHECK (
  -- Pour les modifications: STRICT - pas d'exception super admin
  (get_user_company_id() IS NOT NULL) AND 
  (company_id = get_user_company_id())
);

-- 2. Politique pour les utilisateurs propriétaires (dans leur entreprise uniquement)
CREATE POLICY "offers_user_within_company" 
ON public.offers 
FOR ALL 
USING (
  (auth.uid() IS NOT NULL) AND 
  (user_id = auth.uid()) AND
  (get_user_company_id() IS NOT NULL) AND
  (company_id = get_user_company_id())
)
WITH CHECK (
  (auth.uid() IS NOT NULL) AND 
  (user_id = auth.uid()) AND
  (get_user_company_id() IS NOT NULL) AND
  (company_id = get_user_company_id())
);

-- 3. Politique pour les ambassadeurs (dans leur entreprise uniquement)
CREATE POLICY "offers_ambassador_within_company" 
ON public.offers 
FOR ALL 
USING (
  (auth.uid() IS NOT NULL) AND
  (get_user_company_id() IS NOT NULL) AND
  (company_id = get_user_company_id()) AND
  (ambassador_id IN (
    SELECT id FROM public.ambassadors 
    WHERE user_id = auth.uid() 
    AND company_id = get_user_company_id()
  ))
)
WITH CHECK (
  (auth.uid() IS NOT NULL) AND
  (get_user_company_id() IS NOT NULL) AND
  (company_id = get_user_company_id()) AND
  (ambassador_id IN (
    SELECT id FROM public.ambassadors 
    WHERE user_id = auth.uid() 
    AND company_id = get_user_company_id()
  ))
);

-- 4. Politique publique TRÈS restrictive pour la signature d'offres
CREATE POLICY "offers_public_signature_only" 
ON public.offers 
FOR SELECT 
USING (
  workflow_status IN ('approved', 'client_approved') AND
  signature_data IS NOT NULL
);

-- 5. Politique publique TRÈS restrictive pour les demandes clients anonymes
CREATE POLICY "offers_public_anonymous_insert" 
ON public.offers 
FOR INSERT 
WITH CHECK (
  auth.role() = 'anon' AND 
  type = 'client_request' AND
  company_id IS NOT NULL
);