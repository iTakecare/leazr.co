-- =============================================
-- CORRECTION DES POLITIQUES RLS POUR LES BARÈMES DE COMMISSION
-- =============================================

-- Étape 1: Supprimer TOUTES les politiques conflictuelles sur commission_levels
DROP POLICY IF EXISTS "Admin manage commission_levels" ON public.commission_levels;
DROP POLICY IF EXISTS "commission_levels_admin" ON public.commission_levels;
DROP POLICY IF EXISTS "commission_levels_admin_write" ON public.commission_levels;
DROP POLICY IF EXISTS "commission_levels_strict_company_isolation" ON public.commission_levels;

-- Étape 2: Supprimer TOUTES les politiques conflictuelles sur commission_rates
DROP POLICY IF EXISTS "Admin manage commission_rates" ON public.commission_rates;
DROP POLICY IF EXISTS "commission_rates_admin" ON public.commission_rates;
DROP POLICY IF EXISTS "commission_rates_admin_write" ON public.commission_rates;
DROP POLICY IF EXISTS "commission_rates_strict_company_isolation" ON public.commission_rates;

-- Étape 3: Créer des politiques simples et efficaces pour commission_levels
CREATE POLICY "commission_levels_admin_access" 
ON public.commission_levels 
FOR ALL 
USING (is_admin_optimized())
WITH CHECK (is_admin_optimized());

CREATE POLICY "commission_levels_company_access" 
ON public.commission_levels 
FOR ALL 
USING (
  -- Autoriser l'accès si l'utilisateur appartient à la même entreprise
  (get_user_company_id() IS NOT NULL) AND 
  (company_id = get_user_company_id())
)
WITH CHECK (
  (get_user_company_id() IS NOT NULL) AND 
  (company_id = get_user_company_id())
);

-- Étape 4: Créer des politiques simples et efficaces pour commission_rates
CREATE POLICY "commission_rates_admin_access" 
ON public.commission_rates 
FOR ALL 
USING (is_admin_optimized())
WITH CHECK (is_admin_optimized());

CREATE POLICY "commission_rates_company_access" 
ON public.commission_rates 
FOR ALL 
USING (
  -- Autoriser l'accès si l'utilisateur appartient à la même entreprise
  (get_user_company_id() IS NOT NULL) AND 
  (company_id = get_user_company_id())
)
WITH CHECK (
  (get_user_company_id() IS NOT NULL) AND 
  (company_id = get_user_company_id())
);