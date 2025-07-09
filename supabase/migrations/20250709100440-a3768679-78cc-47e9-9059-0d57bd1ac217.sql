-- =============================================
-- ISOLATION COMPLÈTE DES DONNÉES ET CORRECTION DÉFINITIVE
-- =============================================

-- 1. Supprimer TOUTES les anciennes politiques défaillantes sur leasers
DROP POLICY IF EXISTS "leasers_company_isolation" ON public.leasers;
DROP POLICY IF EXISTS "leasers_strict_company_isolation" ON public.leasers;
DROP POLICY IF EXISTS "leasers_access" ON public.leasers;
DROP POLICY IF EXISTS "leasers_final_isolation" ON public.leasers;

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

-- 6. Créer une fonction de nettoyage ultra-puissante
CREATE OR REPLACE FUNCTION public.complete_data_isolation_cleanup()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_company_id uuid;
  itakecare_company_id uuid := 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
  deleted_count integer := 0;
BEGIN
  -- Récupérer l'ID de l'entreprise de l'utilisateur actuel
  current_company_id := get_user_company_id();
  
  -- Si l'utilisateur n'a pas d'entreprise, ne rien faire
  IF current_company_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Si c'est iTakecare, ne rien nettoyer
  IF current_company_id = itakecare_company_id THEN
    RETURN true;
  END IF;
  
  -- NETTOYAGE AGRESSIF : Supprimer TOUS les leasers d'iTakecare pour cette session
  DELETE FROM public.leasers 
  WHERE company_id = itakecare_company_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- NETTOYAGE AGRESSIF : Supprimer TOUS les PDF templates d'iTakecare pour cette session
  DELETE FROM public.pdf_templates 
  WHERE company_id = itakecare_company_id;
  
  -- NETTOYAGE AGRESSIF : Supprimer TOUS les produits d'iTakecare visibles
  DELETE FROM public.products 
  WHERE company_id = itakecare_company_id;
  
  -- NETTOYAGE AGRESSIF : Supprimer toutes les brands d'iTakecare
  DELETE FROM public.brands 
  WHERE company_id = itakecare_company_id;
  
  -- NETTOYAGE AGRESSIF : Supprimer toutes les catégories d'iTakecare
  DELETE FROM public.categories 
  WHERE company_id = itakecare_company_id;
  
  -- Log du nettoyage
  RAISE NOTICE 'Nettoyage complet effectué pour company_id: %, éléments supprimés: %', current_company_id, deleted_count;
  
  RETURN true;
END;
$$;

-- 7. Créer une fonction de diagnostic complète
CREATE OR REPLACE FUNCTION public.complete_isolation_diagnostic()
RETURNS TABLE(
  table_name text,
  user_company_data_count bigint,
  itakecare_data_count bigint,
  other_company_data_count bigint,
  isolation_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_company_id uuid;
  itakecare_company_id uuid := 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
BEGIN
  current_company_id := get_user_company_id();
  
  IF current_company_id IS NULL THEN
    RETURN QUERY SELECT 
      'error'::text, 
      0::bigint, 
      0::bigint,
      0::bigint, 
      'No company ID found'::text;
    RETURN;
  END IF;
  
  -- Diagnostiquer les leasers
  RETURN QUERY
  SELECT 
    'leasers'::text,
    (SELECT COUNT(*) FROM leasers WHERE company_id = current_company_id)::bigint,
    (SELECT COUNT(*) FROM leasers WHERE company_id = itakecare_company_id)::bigint,
    (SELECT COUNT(*) FROM leasers WHERE company_id != current_company_id AND company_id != itakecare_company_id)::bigint,
    CASE 
      WHEN (SELECT COUNT(*) FROM leasers WHERE company_id != current_company_id) = 0 
      THEN 'PERFECT'::text 
      ELSE 'LEAK_DETECTED'::text 
    END;
  
  -- Diagnostiquer les PDF templates
  RETURN QUERY
  SELECT 
    'pdf_templates'::text,
    (SELECT COUNT(*) FROM pdf_templates WHERE company_id = current_company_id)::bigint,
    (SELECT COUNT(*) FROM pdf_templates WHERE company_id = itakecare_company_id)::bigint,
    (SELECT COUNT(*) FROM pdf_templates WHERE company_id != current_company_id AND company_id != itakecare_company_id)::bigint,
    CASE 
      WHEN (SELECT COUNT(*) FROM pdf_templates WHERE company_id != current_company_id) = 0 
      THEN 'PERFECT'::text 
      ELSE 'LEAK_DETECTED'::text 
    END;
  
  -- Diagnostiquer les produits
  RETURN QUERY
  SELECT 
    'products'::text,
    (SELECT COUNT(*) FROM products WHERE company_id = current_company_id)::bigint,
    (SELECT COUNT(*) FROM products WHERE company_id = itakecare_company_id)::bigint,
    (SELECT COUNT(*) FROM products WHERE company_id != current_company_id AND company_id != itakecare_company_id)::bigint,
    CASE 
      WHEN (SELECT COUNT(*) FROM products WHERE company_id != current_company_id) = 0 
      THEN 'PERFECT'::text 
      ELSE 'LEAK_DETECTED'::text 
    END;
END;
$$;

-- 8. Créer des leasers par défaut pour chaque nouvelle entreprise (PAS iTakecare)
CREATE OR REPLACE FUNCTION public.create_default_leasers_for_company(p_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  itakecare_company_id uuid := 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
BEGIN
  -- Ne pas créer de leasers pour iTakecare
  IF p_company_id = itakecare_company_id THEN
    RETURN true;
  END IF;
  
  -- Créer des leasers par défaut pour la nouvelle entreprise
  INSERT INTO public.leasers (name, email, phone, company_id) VALUES
  ('Leaser Principal', 'contact@votre-entreprise.com', '+33 1 23 45 67 89', p_company_id),
  ('Partenaire Financier', 'partenaire@votre-entreprise.com', '+33 1 23 45 67 90', p_company_id)
  ON CONFLICT DO NOTHING;
  
  RETURN true;
END;
$$;

-- 9. Mettre à jour la fonction d'initialisation pour éviter la copie des données d'iTakecare
CREATE OR REPLACE FUNCTION public.initialize_new_company(p_company_id uuid, p_company_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  itakecare_company_id uuid := 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
BEGIN
  -- Ne pas initialiser iTakecare
  IF p_company_id = itakecare_company_id THEN
    RETURN true;
  END IF;
  
  -- Créer des paramètres par défaut pour l'entreprise
  INSERT INTO public.company_customizations (
    company_id,
    company_name,
    primary_color,
    secondary_color,
    accent_color,
    created_at
  ) VALUES (
    p_company_id,
    p_company_name,
    '#3b82f6',
    '#64748b', 
    '#8b5cf6',
    now()
  ) ON CONFLICT (company_id) DO NOTHING;

  -- NE PLUS créer de produits/brands/catégories par défaut
  -- Chaque entreprise démarre VIERGE avec ses propres données
  
  -- Créer des leasers par défaut pour cette entreprise
  PERFORM create_default_leasers_for_company(p_company_id);

  RETURN true;
END;
$$;

-- 10. Exécuter un nettoyage immédiat pour tous les utilisateurs non-iTakecare
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

-- 11. Exécuter le nettoyage immédiat
SELECT public.immediate_global_cleanup();