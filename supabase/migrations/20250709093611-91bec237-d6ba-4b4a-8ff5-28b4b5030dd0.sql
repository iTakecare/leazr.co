-- =============================================
-- ISOLATION COMPLÈTE DES DONNÉES ET GESTION DES ESSAIS GRATUITS - VERSION CORRIGÉE
-- =============================================

-- 1. Créer une fonction pour vérifier le statut d'essai d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_trial_status()
RETURNS TABLE(
  is_trial boolean,
  trial_ends_at timestamp with time zone,
  days_remaining integer,
  company_name text,
  prospect_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  current_user_email text;
  prospect_record record;
BEGIN
  -- Récupérer l'email de l'utilisateur actuel
  SELECT email INTO current_user_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- Chercher dans la table prospects
  SELECT * INTO prospect_record
  FROM prospects 
  WHERE email = current_user_email 
    AND status = 'active' 
    AND trial_ends_at > now();
  
  IF FOUND THEN
    RETURN QUERY SELECT
      true as is_trial,
      prospect_record.trial_ends_at,
      GREATEST(0, EXTRACT(days FROM (prospect_record.trial_ends_at - now()))::integer) as days_remaining,
      prospect_record.company_name,
      prospect_record.email;
  ELSE
    RETURN QUERY SELECT
      false as is_trial,
      null::timestamp with time zone as trial_ends_at,
      0 as days_remaining,
      null::text as company_name,
      null::text as prospect_email;
  END IF;
END;
$$;

-- 2. Nettoyer TOUTES les politiques existantes et les recréer pour les leasers
DROP POLICY IF EXISTS "leasers_company_isolation" ON public.leasers;
DROP POLICY IF EXISTS "leasers_strict_company_isolation" ON public.leasers;
DROP POLICY IF EXISTS "leasers_access" ON public.leasers;

CREATE POLICY "leasers_final_isolation" 
ON public.leasers 
FOR ALL 
USING (
  (get_user_company_id() IS NOT NULL) AND 
  ((company_id = get_user_company_id()) OR is_admin_optimized())
)
WITH CHECK (
  (get_user_company_id() IS NOT NULL) AND 
  ((company_id = get_user_company_id()) OR is_admin_optimized())
);

-- 3. Nettoyer TOUTES les politiques existantes et les recréer pour les PDF templates
DROP POLICY IF EXISTS "pdf_templates_company_isolation" ON public.pdf_templates;
DROP POLICY IF EXISTS "pdf_templates_strict_company_isolation" ON public.pdf_templates;
DROP POLICY IF EXISTS "pdf_templates_access" ON public.pdf_templates;

CREATE POLICY "pdf_templates_final_isolation" 
ON public.pdf_templates 
FOR ALL 
USING (
  (get_user_company_id() IS NOT NULL) AND 
  ((company_id = get_user_company_id()) OR is_admin_optimized())
)
WITH CHECK (
  (get_user_company_id() IS NOT NULL) AND 
  ((company_id = get_user_company_id()) OR is_admin_optimized())
);

-- 4. Créer une fonction pour nettoyer les données d'iTakecare des autres entreprises
CREATE OR REPLACE FUNCTION public.cleanup_company_data_isolation()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_company_id uuid;
  itakecare_company_id uuid := 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
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
  
  -- Supprimer les données d'iTakecare qui pourraient être visibles
  -- Mais seulement si l'entreprise actuelle a déjà ses propres données
  
  -- Nettoyer les leasers
  DELETE FROM public.leasers 
  WHERE company_id = itakecare_company_id 
    AND id NOT IN (
      SELECT id FROM public.leasers 
      WHERE company_id = current_company_id
    );
  
  -- Nettoyer les PDF templates
  DELETE FROM public.pdf_templates 
  WHERE company_id = itakecare_company_id 
    AND id NOT IN (
      SELECT id FROM public.pdf_templates 
      WHERE company_id = current_company_id
    );
  
  -- Nettoyer les produits copiés d'iTakecare
  DELETE FROM public.products 
  WHERE company_id = itakecare_company_id 
    AND id NOT IN (
      SELECT id FROM public.products 
      WHERE company_id = current_company_id
    );
  
  RETURN true;
END;
$$;

-- 5. Améliorer la fonction de diagnostic pour détecter les problèmes d'isolation
CREATE OR REPLACE FUNCTION public.diagnose_data_isolation()
RETURNS TABLE(
  table_name text,
  user_company_data_count bigint,
  other_company_data_count bigint,
  isolation_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_company_id uuid;
BEGIN
  current_company_id := get_user_company_id();
  
  IF current_company_id IS NULL THEN
    RETURN QUERY SELECT 
      'error'::text, 
      0::bigint, 
      0::bigint, 
      'No company ID found'::text;
    RETURN;
  END IF;
  
  -- Diagnostiquer les clients
  RETURN QUERY
  SELECT 
    'clients'::text,
    (SELECT COUNT(*) FROM clients WHERE company_id = current_company_id)::bigint,
    (SELECT COUNT(*) FROM clients WHERE company_id != current_company_id)::bigint,
    CASE 
      WHEN (SELECT COUNT(*) FROM clients WHERE company_id != current_company_id) = 0 
      THEN 'GOOD'::text 
      ELSE 'LEAK'::text 
    END;
  
  -- Diagnostiquer les offres
  RETURN QUERY
  SELECT 
    'offers'::text,
    (SELECT COUNT(*) FROM offers WHERE company_id = current_company_id)::bigint,
    (SELECT COUNT(*) FROM offers WHERE company_id != current_company_id)::bigint,
    CASE 
      WHEN (SELECT COUNT(*) FROM offers WHERE company_id != current_company_id) = 0 
      THEN 'GOOD'::text 
      ELSE 'LEAK'::text 
    END;
  
  -- Diagnostiquer les contrats
  RETURN QUERY
  SELECT 
    'contracts'::text,
    (SELECT COUNT(*) FROM contracts WHERE company_id = current_company_id)::bigint,
    (SELECT COUNT(*) FROM contracts WHERE company_id != current_company_id)::bigint,
    CASE 
      WHEN (SELECT COUNT(*) FROM contracts WHERE company_id != current_company_id) = 0 
      THEN 'GOOD'::text 
      ELSE 'LEAK'::text 
    END;
  
  -- Diagnostiquer les leasers
  RETURN QUERY
  SELECT 
    'leasers'::text,
    (SELECT COUNT(*) FROM leasers WHERE company_id = current_company_id)::bigint,
    (SELECT COUNT(*) FROM leasers WHERE company_id != current_company_id)::bigint,
    CASE 
      WHEN (SELECT COUNT(*) FROM leasers WHERE company_id != current_company_id) = 0 
      THEN 'GOOD'::text 
      ELSE 'LEAK'::text 
    END;
  
  -- Diagnostiquer les PDF templates
  RETURN QUERY
  SELECT 
    'pdf_templates'::text,
    (SELECT COUNT(*) FROM pdf_templates WHERE company_id = current_company_id)::bigint,
    (SELECT COUNT(*) FROM pdf_templates WHERE company_id != current_company_id)::bigint,
    CASE 
      WHEN (SELECT COUNT(*) FROM pdf_templates WHERE company_id != current_company_id) = 0 
      THEN 'GOOD'::text 
      ELSE 'LEAK'::text 
    END;
END;
$$;