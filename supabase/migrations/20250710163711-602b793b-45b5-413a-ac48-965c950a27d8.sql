-- PHASE 1: CORRECTION CRITIQUE DE L'ISOLATION DES DONNÉES
-- Problèmes identifiés: partners, products, et plusieurs autres tables ont des politiques RLS défectueuses

-- ========================================
-- 1. CORRECTION DE LA TABLE PARTNERS
-- ========================================

-- Supprimer toutes les politiques existantes sur partners
DROP POLICY IF EXISTS "Partners strict company isolation" ON public.partners;
DROP POLICY IF EXISTS "partners_access" ON public.partners;
DROP POLICY IF EXISTS "partners_company_isolation" ON public.partners;
DROP POLICY IF EXISTS "partners_admin" ON public.partners;
DROP POLICY IF EXISTS "partners_admin_write" ON public.partners;

-- Créer une politique RLS stricte pour partners
CREATE POLICY "partners_company_strict_isolation" 
ON public.partners 
FOR ALL 
USING (
  (get_user_company_id() IS NOT NULL) AND 
  (
    (company_id = get_user_company_id()) OR 
    is_admin_optimized()
  )
)
WITH CHECK (
  (get_user_company_id() IS NOT NULL) AND 
  (
    (company_id = get_user_company_id()) OR 
    is_admin_optimized()
  )
);

-- ========================================
-- 2. CORRECTION DE LA TABLE PRODUCTS
-- ========================================

-- Supprimer toutes les politiques existantes sur products
DROP POLICY IF EXISTS "Products strict company isolation" ON public.products;
DROP POLICY IF EXISTS "products_access" ON public.products;
DROP POLICY IF EXISTS "products_company_isolation" ON public.products;
DROP POLICY IF EXISTS "products_itakecare_bypass" ON public.products;
DROP POLICY IF EXISTS "products_admin" ON public.products;
DROP POLICY IF EXISTS "products_admin_write" ON public.products;

-- Créer une politique RLS stricte pour products
CREATE POLICY "products_company_strict_isolation" 
ON public.products 
FOR ALL 
USING (
  (get_user_company_id() IS NOT NULL) AND 
  (
    (company_id = get_user_company_id()) OR 
    is_admin_optimized()
  )
)
WITH CHECK (
  (get_user_company_id() IS NOT NULL) AND 
  (
    (company_id = get_user_company_id()) OR 
    is_admin_optimized()
  )
);

-- ========================================
-- 3. CORRECTION DE LA TABLE COMMISSION_LEVELS
-- ========================================

-- Supprimer les politiques problématiques
DROP POLICY IF EXISTS "Admin manage commission_levels" ON public.commission_levels;
DROP POLICY IF EXISTS "commission_levels_admin" ON public.commission_levels;
DROP POLICY IF EXISTS "commission_levels_admin_write" ON public.commission_levels;

-- Garder seulement la politique stricte moderne
-- La politique "commission_levels_strict_company_isolation" existe déjà et est correcte

-- ========================================
-- 4. CORRECTION DE LA TABLE COMMISSION_RATES
-- ========================================

-- Supprimer les politiques problématiques
DROP POLICY IF EXISTS "Admin manage commission_rates" ON public.commission_rates;
DROP POLICY IF EXISTS "commission_rates_admin" ON public.commission_rates;
DROP POLICY IF EXISTS "commission_rates_admin_write" ON public.commission_rates;

-- Garder seulement la politique stricte moderne
-- La politique "commission_rates_strict_company_isolation" existe déjà et est correcte

-- ========================================
-- 5. CORRECTION DE LA TABLE BRANDS
-- ========================================

-- Supprimer la politique bypass problématique
DROP POLICY IF EXISTS "brands_itakecare_bypass" ON public.brands;

-- Garder seulement la politique stricte
-- La politique "brands_company_isolation" existe déjà et est correcte

-- ========================================
-- 6. CORRECTION DE LA TABLE CATEGORIES
-- ========================================

-- Supprimer la politique bypass problématique
DROP POLICY IF EXISTS "categories_itakecare_bypass" ON public.categories;

-- Garder seulement la politique stricte
-- La politique "categories_company_isolation" existe déjà et est correcte

-- ========================================
-- 7. FONCTION SÉCURISÉE POUR LES PARTNERS
-- ========================================

-- Créer une fonction sécurisée pour récupérer les partners de l'entreprise
CREATE OR REPLACE FUNCTION public.get_company_partners_secure(p_company_id uuid)
RETURNS TABLE(
  id uuid, 
  name text, 
  contact_name text, 
  email text, 
  phone text, 
  type text, 
  status text, 
  notes text, 
  commission_level_id uuid,
  company_id uuid, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Vérifier que le company_id est fourni
  IF p_company_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Retourner TOUS les partners de l'entreprise spécifiée
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.contact_name,
    p.email,
    p.phone,
    p.type,
    p.status,
    p.notes,
    p.commission_level_id,
    p.company_id,
    p.created_at,
    p.updated_at
  FROM public.partners p
  WHERE p.company_id = p_company_id
  ORDER BY p.created_at DESC;
END;
$function$;