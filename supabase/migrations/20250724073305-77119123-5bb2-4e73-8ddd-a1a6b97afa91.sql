-- Phase 1: Nettoyage complet des politiques RLS sur la table products
-- Supprimer TOUTES les politiques existantes qui causent des conflits

DROP POLICY IF EXISTS "Products access policy" ON public.products;
DROP POLICY IF EXISTS "Products strict company isolation" ON public.products;
DROP POLICY IF EXISTS "products_complete_isolation" ON public.products;
DROP POLICY IF EXISTS "Admin full access to products" ON public.products;
DROP POLICY IF EXISTS "Company members can manage their products" ON public.products;
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
DROP POLICY IF EXISTS "products_read_access" ON public.products;
DROP POLICY IF EXISTS "products_admin_access" ON public.products;

-- Créer UNE SEULE politique RLS simple et fonctionnelle pour les produits
CREATE POLICY "products_unified_access" ON public.products
FOR ALL USING (
  -- Admin peut tout voir et faire
  is_admin_optimized() OR
  -- Utilisateurs de la même entreprise peuvent voir leurs produits
  (get_user_company_id() IS NOT NULL AND company_id = get_user_company_id()) OR
  -- Accès public pour les produits actifs non-admin
  (active = true AND (admin_only = false OR admin_only IS NULL))
) WITH CHECK (
  -- Pour les modifications/insertions: admin ou même entreprise
  is_admin_optimized() OR
  (get_user_company_id() IS NOT NULL AND company_id = get_user_company_id())
);

-- Vérifier que RLS est activé
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;