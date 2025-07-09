-- Diagnostic et correction complète de l'isolation des ambassadeurs
-- Le problème : get_user_company_id() retourne null, donc RLS ne fonctionne pas

-- Étape 1: Fonction de diagnostic complète
CREATE OR REPLACE FUNCTION public.diagnose_ambassador_isolation()
RETURNS TABLE(
  step_name text,
  result text,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  user_company_id uuid;
  user_email text;
  company_name text;
BEGIN
  -- Test 1: Vérifier auth.uid()
  current_user_id := auth.uid();
  RETURN QUERY SELECT 
    'auth_uid'::text, 
    CASE WHEN current_user_id IS NOT NULL THEN 'SUCCESS' ELSE 'FAILED' END::text,
    COALESCE(current_user_id::text, 'NULL')::text;

  -- Test 2: Vérifier si le profil existe
  IF current_user_id IS NOT NULL THEN
    SELECT email INTO user_email FROM auth.users WHERE id = current_user_id;
    RETURN QUERY SELECT 
      'user_email'::text,
      CASE WHEN user_email IS NOT NULL THEN 'SUCCESS' ELSE 'FAILED' END::text,
      COALESCE(user_email, 'NULL')::text;

    -- Test 3: Vérifier le profil dans public.profiles
    SELECT company_id INTO user_company_id FROM public.profiles WHERE id = current_user_id;
    RETURN QUERY SELECT 
      'profile_exists'::text,
      CASE WHEN user_company_id IS NOT NULL THEN 'SUCCESS' ELSE 'FAILED' END::text,
      COALESCE(user_company_id::text, 'Profile exists but company_id is NULL')::text;

    -- Test 4: Vérifier le nom de l'entreprise
    IF user_company_id IS NOT NULL THEN
      SELECT name INTO company_name FROM public.companies WHERE id = user_company_id;
      RETURN QUERY SELECT 
        'company_name'::text,
        'SUCCESS'::text,
        COALESCE(company_name, 'Company not found')::text;
    END IF;
  END IF;

  -- Test 5: Compter les ambassadeurs total vs par entreprise
  RETURN QUERY SELECT 
    'total_ambassadors'::text,
    'INFO'::text,
    (SELECT COUNT(*)::text FROM public.ambassadors)::text;

  IF user_company_id IS NOT NULL THEN
    RETURN QUERY SELECT 
      'company_ambassadors'::text,
      'INFO'::text,
      (SELECT COUNT(*)::text FROM public.ambassadors WHERE company_id = user_company_id)::text;
  END IF;
END;
$$;

-- Étape 2: Corriger la fonction get_user_company_id avec une approche plus directe
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT company_id 
  FROM public.profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Étape 3: Simplifier la politique RLS pour éviter les problèmes de récursion
DROP POLICY IF EXISTS "ambassadors_company_isolation" ON public.ambassadors;

CREATE POLICY "ambassadors_company_isolation" 
ON public.ambassadors 
FOR ALL 
USING (
  -- Approche directe sans fonction intermédiaire pour éviter les problèmes de permissions
  company_id IN (
    SELECT p.company_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid()
  )
  OR 
  -- Admin check
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  company_id IN (
    SELECT p.company_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid()
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
  )
);

-- Étape 4: Test de la nouvelle politique
SELECT 
  'Diagnostic ambassadors isolation'::text as test_name,
  public.diagnose_ambassador_isolation() as diagnostic_results;