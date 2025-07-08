
-- Migration pour corriger l'isolation des données et permettre l'inscription
-- Problème : Les politiques RLS actuelles empêchent l'inscription et causent la visibilité des données iTakecare

-- 1. CORRIGER LA TABLE COMPANIES - Permettre l'inscription tout en maintenant l'isolation
DROP POLICY IF EXISTS "Company strict isolation" ON public.companies;

CREATE POLICY "Company strict isolation" ON public.companies
FOR ALL USING (
  id = get_user_company_id() 
  OR is_admin_optimized()
  OR (
    -- Permettre aux utilisateurs iTakecare de voir leur entreprise
    get_current_user_email() IS NOT NULL
    AND get_current_user_email() LIKE '%itakecare.be%'
    AND companies.name = 'iTakecare'
  )
) WITH CHECK (
  -- Permettre la création d'entreprises pendant l'inscription (pour utilisateurs authentifiés)
  auth.uid() IS NOT NULL
);

-- 2. CORRIGER LA TABLE PROFILES - Permettre la création et mise à jour pendant l'inscription
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Profiles management" ON public.profiles
FOR ALL USING (
  id = auth.uid() 
  OR is_admin_optimized()
  OR (
    -- Les admins peuvent voir tous les profils de leur entreprise
    company_id = get_user_company_id() 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
) WITH CHECK (
  id = auth.uid() 
  OR is_admin_optimized()
);

-- 3. AMÉLIORER LES POLITIQUES DES TABLES MÉTIER POUR GÉRER LES CAS NULL

-- 3.1 Corriger la table PRODUCTS
DROP POLICY IF EXISTS "Products strict company isolation" ON public.products;

CREATE POLICY "Products strict company isolation" ON public.products
FOR ALL USING (
  -- Si l'utilisateur n'a pas de company_id, il ne voit rien
  get_user_company_id() IS NOT NULL 
  AND (
    company_id = get_user_company_id() 
    OR is_admin_optimized()
  )
) WITH CHECK (
  get_user_company_id() IS NOT NULL 
  AND (
    company_id = get_user_company_id() 
    OR is_admin_optimized()
  )
);

-- 3.2 Corriger la table CLIENTS
DROP POLICY IF EXISTS "Clients strict company isolation" ON public.clients;

CREATE POLICY "Clients strict company isolation" ON public.clients
FOR ALL USING (
  -- Si l'utilisateur n'a pas de company_id, il ne voit rien
  get_user_company_id() IS NOT NULL 
  AND (
    company_id = get_user_company_id()
    OR is_admin_optimized()
    OR user_id = auth.uid()
  )
) WITH CHECK (
  get_user_company_id() IS NOT NULL 
  AND (
    company_id = get_user_company_id()
    OR is_admin_optimized()
  )
);

-- 3.3 Corriger la table OFFERS
DROP POLICY IF EXISTS "Offers strict company isolation" ON public.offers;

CREATE POLICY "Offers strict company isolation" ON public.offers
FOR ALL USING (
  -- Accès public pour les offres signées (pour signature)
  (
    auth.role() = 'anon' 
    AND workflow_status = 'approved'
    AND signature_data IS NOT NULL
  )
  OR (
    -- Pour les utilisateurs authentifiés : seulement s'ils ont un company_id
    get_user_company_id() IS NOT NULL 
    AND (
      company_id = get_user_company_id()
      OR is_admin_optimized()
      OR user_id = auth.uid()
    )
  )
) WITH CHECK (
  get_user_company_id() IS NOT NULL 
  AND (
    company_id = get_user_company_id()
    OR is_admin_optimized()
  )
);

-- 3.4 Corriger la table CONTRACTS
DROP POLICY IF EXISTS "Contracts strict company isolation" ON public.contracts;

CREATE POLICY "Contracts strict company isolation" ON public.contracts
FOR ALL USING (
  -- Si l'utilisateur n'a pas de company_id, il ne voit rien
  get_user_company_id() IS NOT NULL 
  AND (
    company_id = get_user_company_id()
    OR is_admin_optimized()
    OR (
      client_id IN (
        SELECT id FROM clients 
        WHERE user_id = auth.uid()
      )
    )
  )
) WITH CHECK (
  get_user_company_id() IS NOT NULL 
  AND (
    company_id = get_user_company_id()
    OR is_admin_optimized()
  )
);

-- 3.5 Corriger la table AMBASSADORS
DROP POLICY IF EXISTS "Ambassadors strict company isolation" ON public.ambassadors;

CREATE POLICY "Ambassadors strict company isolation" ON public.ambassadors
FOR ALL USING (
  -- Si l'utilisateur n'a pas de company_id, il ne voit rien
  get_user_company_id() IS NOT NULL 
  AND (
    company_id = get_user_company_id()
    OR is_admin_optimized()
    OR user_id = auth.uid()
  )
) WITH CHECK (
  get_user_company_id() IS NOT NULL 
  AND (
    company_id = get_user_company_id()
    OR is_admin_optimized()
  )
);

-- 3.6 Corriger la table PARTNERS
DROP POLICY IF EXISTS "Partners strict company isolation" ON public.partners;

CREATE POLICY "Partners strict company isolation" ON public.partners
FOR ALL USING (
  -- Si l'utilisateur n'a pas de company_id, il ne voit rien
  get_user_company_id() IS NOT NULL 
  AND (
    company_id = get_user_company_id()
    OR is_admin_optimized()
  )
) WITH CHECK (
  get_user_company_id() IS NOT NULL 
  AND (
    company_id = get_user_company_id()
    OR is_admin_optimized()
  )
);

-- 3.7 Corriger la table LEASERS
DROP POLICY IF EXISTS "Leasers strict company isolation" ON public.leasers;

CREATE POLICY "Leasers strict company isolation" ON public.leasers
FOR ALL USING (
  -- Si l'utilisateur n'a pas de company_id, il ne voit rien
  get_user_company_id() IS NOT NULL 
  AND (
    company_id = get_user_company_id()
    OR is_admin_optimized()
  )
) WITH CHECK (
  get_user_company_id() IS NOT NULL 
  AND (
    company_id = get_user_company_id()
    OR is_admin_optimized()
  )
);

-- 4. AJOUTER UNE POLITIQUE POUR ASSURER QUE LES NOUVEAUX USERS ONT UNE BASE VIERGE
-- Les utilisateurs sans company_id ne voient aucune donnée grâce aux conditions "get_user_company_id() IS NOT NULL"

-- 5. VÉRIFICATION : S'assurer que toutes les tables sensibles ont des politiques
-- Cette migration garantit que :
-- - Les nouveaux clients peuvent s'inscrire (création profile + company autorisée)
-- - Une fois inscrits, ils ne voient que leurs propres données
-- - Les utilisateurs sans company_id ne voient aucune donnée
-- - L'isolation entre entreprises est maintenue
