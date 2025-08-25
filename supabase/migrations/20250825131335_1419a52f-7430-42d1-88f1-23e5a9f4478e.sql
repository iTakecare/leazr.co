-- Diagnostic et correction des fonctions de sécurité et politiques RLS des offres

-- Étape 1: Améliorer les fonctions de sécurité pour éviter les valeurs NULL

-- Corriger get_user_company_id pour être plus robuste
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
DECLARE
  user_company_id uuid;
BEGIN
  -- Vérifier d'abord si l'utilisateur est authentifié
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Récupérer le company_id depuis la table profiles
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN user_company_id;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, retourner NULL plutôt que de planter
    RETURN NULL;
END;
$$;

-- Corriger is_admin_optimized pour être plus robuste
CREATE OR REPLACE FUNCTION public.is_admin_optimized()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
DECLARE
  user_role text;
BEGIN
  -- Vérifier d'abord si l'utilisateur est authentifié
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Récupérer le rôle depuis la table profiles
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- Retourner true si l'utilisateur est admin ou super_admin
  RETURN user_role = ANY(ARRAY['admin', 'super_admin']);
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, retourner false pour sécurité
    RETURN false;
END;
$$;

-- Étape 2: Supprimer les politiques RLS redondantes tout en gardant les fonctionnalités cruciales

-- Supprimer les politiques redondantes (celles qui font la même chose)
DROP POLICY IF EXISTS "offers_access" ON public.offers;
DROP POLICY IF EXISTS "Company members can manage their offers" ON public.offers;
DROP POLICY IF EXISTS "offers_secure_access_fixed" ON public.offers;

-- Étape 3: Renommer les politiques importantes pour contrôler l'ordre d'évaluation
-- (PostgreSQL évalue par ordre alphabétique, donc utiliser des préfixes numériques)

-- 1. Admin access (plus permissif en premier)
DROP POLICY IF EXISTS "Admin full access to offers" ON public.offers;
CREATE POLICY "01_admin_full_access"
ON public.offers
FOR ALL
TO public
USING (is_admin_optimized())
WITH CHECK (is_admin_optimized());

-- 2. Public access pour les tokens (accès en lecture seule)
DROP POLICY IF EXISTS "Public access for valid upload tokens" ON public.offers;
CREATE POLICY "02_public_token_access"
ON public.offers
FOR SELECT
TO public
USING (
  id IN (
    SELECT offer_upload_links.offer_id
    FROM offer_upload_links
    WHERE offer_upload_links.expires_at > now() 
      AND offer_upload_links.used_at IS NULL
  )
);

-- 3. Accès pour signature (lecture seule étendue)
DROP POLICY IF EXISTS "offers_secure_signature_access" ON public.offers;
CREATE POLICY "03_signature_access"
ON public.offers
FOR SELECT
TO public
USING (
  (auth.uid() IS NOT NULL AND get_user_company_id() IS NOT NULL AND company_id = get_user_company_id()) 
  OR is_admin_optimized()
  OR (id IN (
    SELECT offer_upload_links.offer_id
    FROM offer_upload_links
    WHERE offer_upload_links.expires_at > now() 
      AND offer_upload_links.used_at IS NULL
  ))
);

-- 4. Création d'offres client (INSERT seulement)
DROP POLICY IF EXISTS "offers_client_request_secure" ON public.offers;
CREATE POLICY "04_client_request_creation"
ON public.offers
FOR INSERT
TO public
WITH CHECK (
  type = 'client_request'
  AND company_id IS NOT NULL
  AND workflow_status = 'draft'
);

-- 5. Accès ambassadeur (gestion complète pour leurs offres)
DROP POLICY IF EXISTS "Ambassadors can manage their offers" ON public.offers;
CREATE POLICY "05_ambassador_access"
ON public.offers
FOR ALL
TO public
USING (
  ambassador_id IN (
    SELECT ambassadors.id
    FROM ambassadors
    WHERE ambassadors.user_id = auth.uid()
  )
)
WITH CHECK (
  ambassador_id IN (
    SELECT ambassadors.id
    FROM ambassadors
    WHERE ambassadors.user_id = auth.uid()
  )
);

-- 6. Accès client final (leurs propres offres seulement)
DROP POLICY IF EXISTS "Users can manage their own offers" ON public.offers;
CREATE POLICY "06_client_own_offers"
ON public.offers
FOR ALL
TO public
USING (
  auth.uid() IS NOT NULL 
  AND (user_id = auth.uid() OR client_id IN (
    SELECT c.id FROM clients c WHERE c.user_id = auth.uid()
  ))
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (user_id = auth.uid() OR client_id IN (
    SELECT c.id FROM clients c WHERE c.user_id = auth.uid()
  ))
);

-- 7. Isolation multi-tenant (accès complet pour les membres de l'entreprise)
DROP POLICY IF EXISTS "offers_strict_company_isolation_secure" ON public.offers;
CREATE POLICY "07_company_isolation"
ON public.offers
FOR ALL
TO public
USING (
  auth.uid() IS NOT NULL
  AND get_user_company_id() IS NOT NULL
  AND (
    company_id = get_user_company_id()
    OR is_admin_optimized()
    OR user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND get_user_company_id() IS NOT NULL
  AND (
    company_id = get_user_company_id()
    OR is_admin_optimized()
  )
);

-- Étape 4: Ajouter des commentaires pour documenter chaque politique
COMMENT ON POLICY "01_admin_full_access" ON public.offers IS 
'Accès complet pour les administrateurs système';

COMMENT ON POLICY "02_public_token_access" ON public.offers IS 
'Accès en lecture seule via tokens publics pour signature';

COMMENT ON POLICY "03_signature_access" ON public.offers IS 
'Accès étendu en lecture pour processus de signature';

COMMENT ON POLICY "04_client_request_creation" ON public.offers IS 
'Permet aux clients de créer des demandes d''offres';

COMMENT ON POLICY "05_ambassador_access" ON public.offers IS 
'Accès complet aux ambassadeurs pour leurs offres';

COMMENT ON POLICY "06_client_own_offers" ON public.offers IS 
'Permet aux clients finaux de voir leurs propres offres';

COMMENT ON POLICY "07_company_isolation" ON public.offers IS 
'Isolation multi-tenant - membres d''entreprise accèdent à leurs offres';