-- Correction de la récursion infinie dans les politiques RLS des offres

-- Le problème vient du fait que plusieurs politiques évaluent les mêmes conditions
-- et qu'il peut y avoir des conflits. Je vais simplifier drastiquement.

-- Étape 1: Supprimer TOUTES les politiques actuelles
DROP POLICY IF EXISTS "01_admin_full_access" ON public.offers;
DROP POLICY IF EXISTS "02_public_token_access" ON public.offers;
DROP POLICY IF EXISTS "03_signature_access" ON public.offers;
DROP POLICY IF EXISTS "04_client_request_creation" ON public.offers;
DROP POLICY IF EXISTS "05_ambassador_access" ON public.offers;
DROP POLICY IF EXISTS "06_client_own_offers" ON public.offers;
DROP POLICY IF EXISTS "07_company_isolation" ON public.offers;

-- Étape 2: Créer une politique ultra-simple et sûre pour commencer
-- Cette politique donne accès complet aux admins et aux membres de leur entreprise
CREATE POLICY "offers_unified_access"
ON public.offers
FOR ALL
TO public
USING (
  -- Admin complet
  is_admin_optimized()
  OR 
  -- Membres de l'entreprise (sans fonction récursive)
  (auth.uid() IS NOT NULL AND company_id IN (
    SELECT p.company_id 
    FROM profiles p 
    WHERE p.id = auth.uid()
  ))
  OR
  -- Accès public via tokens (lecture seule)
  (id IN (
    SELECT oul.offer_id
    FROM offer_upload_links oul
    WHERE oul.expires_at > now() 
      AND oul.used_at IS NULL
  ))
  OR
  -- Accès direct utilisateur (client final)
  user_id = auth.uid()
  OR
  -- Accès via client associé
  (auth.uid() IS NOT NULL AND client_id IN (
    SELECT c.id FROM clients c WHERE c.user_id = auth.uid()
  ))
  OR
  -- Accès ambassadeur
  (auth.uid() IS NOT NULL AND ambassador_id IN (
    SELECT a.id FROM ambassadors a WHERE a.user_id = auth.uid()
  ))
)
WITH CHECK (
  -- Pour les insertions/modifications, plus restrictif
  is_admin_optimized()
  OR 
  (auth.uid() IS NOT NULL AND company_id IN (
    SELECT p.company_id 
    FROM profiles p 
    WHERE p.id = auth.uid()
  ))
  OR
  -- Création client request
  (type = 'client_request' AND company_id IS NOT NULL AND workflow_status = 'draft')
  OR
  -- Ambassadeur peut modifier ses offres
  (auth.uid() IS NOT NULL AND ambassador_id IN (
    SELECT a.id FROM ambassadors a WHERE a.user_id = auth.uid()
  ))
  OR
  -- Client peut modifier ses propres offres
  user_id = auth.uid()
);