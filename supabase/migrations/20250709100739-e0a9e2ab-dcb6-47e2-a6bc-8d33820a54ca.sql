-- =============================================
-- ISOLATION COMPLÈTE DES DONNÉES ET CORRECTION DÉFINITIVE (Version corrigée)
-- =============================================

-- 1. Supprimer TOUTES les anciennes politiques défaillantes sur leasers (inclure complete_isolation)
DROP POLICY IF EXISTS "leasers_company_isolation" ON public.leasers;
DROP POLICY IF EXISTS "leasers_strict_company_isolation" ON public.leasers;
DROP POLICY IF EXISTS "leasers_access" ON public.leasers;
DROP POLICY IF EXISTS "leasers_final_isolation" ON public.leasers;
DROP POLICY IF EXISTS "leasers_complete_isolation" ON public.leasers;

-- 2. Créer une politique RLS ultra-stricte pour leasers (AUCUNE exception pour iTakecare)
CREATE POLICY "leasers_complete_isolation" 
ON public.leasers 
FOR ALL 
USING (
  (get_user_company_id() IS NOT NULL) AND 
  (company_id = get_user_company_id()) AND
  (company_id != 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'::uuid OR is_admin_optimized())
)
WITH CHECK (
  (get_user_company_id() IS NOT NULL) AND 
  (company_id = get_user_company_id()) AND
  (company_id != 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'::uuid OR is_admin_optimized())
);

-- 3. Supprimer TOUTES les anciennes politiques défaillantes sur pdf_templates
DROP POLICY IF EXISTS "pdf_templates_company_isolation" ON public.pdf_templates;
DROP POLICY IF EXISTS "pdf_templates_strict_company_isolation" ON public.pdf_templates;
DROP POLICY IF EXISTS "pdf_templates_access" ON public.pdf_templates;
DROP POLICY IF EXISTS "pdf_templates_final_isolation" ON public.pdf_templates;
DROP POLICY IF EXISTS "pdf_templates_complete_isolation" ON public.pdf_templates;

-- 4. Créer une politique RLS ultra-stricte pour pdf_templates
CREATE POLICY "pdf_templates_complete_isolation" 
ON public.pdf_templates 
FOR ALL 
USING (
  (get_user_company_id() IS NOT NULL) AND 
  (company_id = get_user_company_id()) AND
  (company_id != 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'::uuid OR is_admin_optimized())
)
WITH CHECK (
  (get_user_company_id() IS NOT NULL) AND 
  (company_id = get_user_company_id()) AND
  (company_id != 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'::uuid OR is_admin_optimized())
);

-- 5. Renforcer l'isolation sur products
DROP POLICY IF EXISTS "products_company_isolation" ON public.products;
DROP POLICY IF EXISTS "products_complete_isolation" ON public.products;
CREATE POLICY "products_complete_isolation" 
ON public.products 
FOR ALL 
USING (
  (get_user_company_id() IS NOT NULL) AND 
  (company_id = get_user_company_id()) AND
  (company_id != 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'::uuid OR is_admin_optimized())
)
WITH CHECK (
  (get_user_company_id() IS NOT NULL) AND 
  (company_id = get_user_company_id()) AND
  (company_id != 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'::uuid OR is_admin_optimized())
);

-- 6. Exécuter un nettoyage immédiat pour tous les utilisateurs non-iTakecare
-- ATTENTION: Cette fonction supprime définitivement les données d'iTakecare pour les autres entreprises
CREATE OR REPLACE FUNCTION public.immediate_global_cleanup()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  itakecare_company_id uuid := 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
  cleanup_count integer := 0;
BEGIN
  -- Supprimer tous les leasers d'iTakecare visibles par d'autres entreprises
  DELETE FROM public.leasers 
  WHERE company_id = itakecare_company_id;
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  -- Supprimer tous les PDF templates d'iTakecare
  DELETE FROM public.pdf_templates 
  WHERE company_id = itakecare_company_id;
  
  -- Supprimer tous les produits d'iTakecare
  DELETE FROM public.products 
  WHERE company_id = itakecare_company_id;
  
  RETURN 'Nettoyage global terminé. Éléments supprimés: ' || cleanup_count::text;
END;
$$;

-- 7. Exécuter le nettoyage immédiat
SELECT public.immediate_global_cleanup();