-- CORRECTION CRITIQUE DE L'ISOLATION DES DONNÉES ENTRE ENTREPRISES
-- Problème: La politique "Admin full access to offers" permet aux admins de voir les offres de TOUTES les entreprises
-- Solution: Supprimer cette politique et s'assurer que les admins ne voient que les offres de leur propre entreprise

-- Étape 1: Supprimer la politique RLS défectueuse qui brise l'isolation
DROP POLICY IF EXISTS "Admin full access to offers" ON public.offers;

-- Étape 2: Supprimer les politiques redondantes pour éviter les conflits
DROP POLICY IF EXISTS "Company members can manage their offers" ON public.offers;
DROP POLICY IF EXISTS "Users can manage their own offers" ON public.offers;
DROP POLICY IF EXISTS "Ambassadors can manage their offers" ON public.offers;
DROP POLICY IF EXISTS "Public can view signed offers" ON public.offers;
DROP POLICY IF EXISTS "Allow public offer requests" ON public.offers;

-- Étape 3: Créer des politiques RLS correctes avec isolation stricte par entreprise

-- 1. Politique principale: Accès par entreprise (inclut les admins de leur propre entreprise)
CREATE POLICY "offers_strict_company_isolation" 
ON public.offers 
FOR ALL 
USING (
  -- Condition stricte: l'utilisateur doit avoir un company_id valide
  (get_user_company_id() IS NOT NULL) AND 
  (
    -- L'offre appartient à la même entreprise OU l'utilisateur est super admin iTakecare
    (company_id = get_user_company_id()) OR 
    (
      is_admin_optimized() AND 
      get_current_user_email() LIKE '%@itakecare.be' AND 
      get_user_company_id() = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
    )
  )
)
WITH CHECK (
  -- Pour les modifications, même logique mais sans accès super admin
  (get_user_company_id() IS NOT NULL) AND 
  (company_id = get_user_company_id())
);

-- 2. Politique pour les utilisateurs propriétaires de leurs propres offres
CREATE POLICY "offers_user_ownership" 
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

-- 3. Politique pour les ambassadeurs qui peuvent gérer leurs propres offres
CREATE POLICY "offers_ambassador_ownership" 
ON public.offers 
FOR ALL 
USING (
  (auth.uid() IS NOT NULL) AND
  (ambassador_id IN (
    SELECT id FROM public.ambassadors 
    WHERE user_id = auth.uid() 
    AND company_id = get_user_company_id()
  )) AND
  (get_user_company_id() IS NOT NULL) AND
  (company_id = get_user_company_id())
)
WITH CHECK (
  (auth.uid() IS NOT NULL) AND
  (ambassador_id IN (
    SELECT id FROM public.ambassadors 
    WHERE user_id = auth.uid() 
    AND company_id = get_user_company_id()
  )) AND
  (get_user_company_id() IS NOT NULL) AND
  (company_id = get_user_company_id())
);

-- 4. Politique publique très restrictive pour la lecture des offres signées (nécessaire pour la signature)
CREATE POLICY "offers_public_signed_read_only" 
ON public.offers 
FOR SELECT 
USING (
  workflow_status IN ('approved', 'client_approved') AND
  signature_data IS NOT NULL
);

-- 5. Politique publique très restrictive pour l'insertion de demandes clients
CREATE POLICY "offers_public_client_requests" 
ON public.offers 
FOR INSERT 
WITH CHECK (
  auth.role() = 'anon' AND 
  type = 'client_request' AND
  company_id IS NOT NULL
);