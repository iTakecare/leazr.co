-- Corriger l'isolation des données entre entreprises
-- Problème : les politiques RLS actuelles permettent aux entreprises de voir les données d'autres entreprises

-- 1. CORRIGER LA TABLE PRODUCTS
-- Supprimer les politiques trop permissives qui permettent l'accès public aux produits actifs
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
DROP POLICY IF EXISTS "products_read_access" ON public.products;

-- Créer une nouvelle politique stricte pour les produits
CREATE POLICY "Products strict company isolation" ON public.products
FOR ALL USING (
  -- Accès seulement aux produits de la même entreprise OU admin
  company_id = get_user_company_id() 
  OR is_admin_optimized()
  OR (
    -- Exception pour les produits dans les offres publiques signées
    auth.role() = 'anon' 
    AND id IN (
      SELECT DISTINCT oe.product_id 
      FROM offer_equipment oe
      JOIN offers o ON oe.offer_id = o.id
      WHERE o.workflow_status = 'approved'
      AND o.id IN (
        SELECT id FROM offers 
        WHERE signature_data IS NOT NULL 
        AND signed_at IS NOT NULL
      )
    )
  )
) WITH CHECK (
  company_id = get_user_company_id() 
  OR is_admin_optimized()
);

-- 2. VÉRIFIER ET CORRIGER LA TABLE CLIENTS
-- Supprimer les politiques potentiellement permissives
DROP POLICY IF EXISTS "client_access" ON public.clients;

-- Créer une politique stricte pour les clients
CREATE POLICY "Clients strict company isolation" ON public.clients
FOR ALL USING (
  company_id = get_user_company_id()
  OR is_admin_optimized()
  OR user_id = auth.uid() -- Le client peut voir ses propres données
) WITH CHECK (
  company_id = get_user_company_id()
  OR is_admin_optimized()
);

-- 3. VÉRIFIER ET CORRIGER LA TABLE OFFERS
-- Supprimer les politiques potentiellement permissives
DROP POLICY IF EXISTS "offer_access" ON public.offers;

-- Créer une politique stricte pour les offres
CREATE POLICY "Offers strict company isolation" ON public.offers
FOR ALL USING (
  company_id = get_user_company_id()
  OR is_admin_optimized()
  OR user_id = auth.uid()
  OR (
    -- Accès public pour les offres signées (pour signature)
    auth.role() = 'anon' 
    AND workflow_status = 'approved'
    AND signature_data IS NOT NULL
  )
) WITH CHECK (
  company_id = get_user_company_id()
  OR is_admin_optimized()
);

-- 4. VÉRIFIER ET CORRIGER LA TABLE CONTRACTS
-- Les contrats doivent être strictement isolés par entreprise
CREATE POLICY "Contracts strict company isolation" ON public.contracts
FOR ALL USING (
  company_id = get_user_company_id()
  OR is_admin_optimized()
  OR (
    -- Le client peut voir ses propres contrats
    client_id IN (
      SELECT id FROM clients 
      WHERE user_id = auth.uid()
    )
  )
) WITH CHECK (
  company_id = get_user_company_id()
  OR is_admin_optimized()
);

-- 5. CORRIGER LA TABLE AMBASSADORS
DROP POLICY IF EXISTS "Allow all authenticated users to manage ambassadors" ON public.ambassadors;
DROP POLICY IF EXISTS "Allow all authenticated users to view ambassadors" ON public.ambassadors;

CREATE POLICY "Ambassadors strict company isolation" ON public.ambassadors
FOR ALL USING (
  company_id = get_user_company_id()
  OR is_admin_optimized()
  OR user_id = auth.uid() -- L'ambassadeur peut voir son propre profil
) WITH CHECK (
  company_id = get_user_company_id()
  OR is_admin_optimized()
);

-- 6. CORRIGER LA TABLE PARTNERS
CREATE POLICY "Partners strict company isolation" ON public.partners
FOR ALL USING (
  company_id = get_user_company_id()
  OR is_admin_optimized()
) WITH CHECK (
  company_id = get_user_company_id()
  OR is_admin_optimized()
);

-- 7. AUDIT DES AUTRES TABLES SENSIBLES
-- S'assurer que les leasers sont aussi isolés par entreprise
CREATE POLICY "Leasers strict company isolation" ON public.leasers
FOR ALL USING (
  company_id = get_user_company_id()
  OR is_admin_optimized()
) WITH CHECK (
  company_id = get_user_company_id()
  OR is_admin_optimized()
);