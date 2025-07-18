
-- Créer une fonction sécurisée pour vérifier si l'utilisateur est l'admin SaaS
CREATE OR REPLACE FUNCTION public.is_saas_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Récupérer l'email de l'utilisateur actuel
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- Vérifier si c'est l'admin SaaS
  RETURN user_email = 'ecommerce@itakecare.be';
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, retourner false
    RETURN false;
END;
$$;

-- Supprimer les anciennes politiques problématiques
DROP POLICY IF EXISTS "Admin SaaS can manage all deployments" ON public.netlify_deployments;
DROP POLICY IF EXISTS "Admin SaaS can manage all configurations" ON public.netlify_configurations;
DROP POLICY IF EXISTS "Public read netlify_deployments for admin" ON public.netlify_deployments;
DROP POLICY IF EXISTS "Public read netlify_configurations for admin" ON public.netlify_configurations;

-- Créer des politiques simplifiées sans accès direct à auth.users
CREATE POLICY "SaaS admin can manage deployments" 
ON public.netlify_deployments 
FOR ALL 
USING (is_saas_admin() OR is_admin_optimized())
WITH CHECK (is_saas_admin() OR is_admin_optimized());

CREATE POLICY "SaaS admin can manage configurations" 
ON public.netlify_configurations 
FOR ALL 
USING (is_saas_admin() OR is_admin_optimized())
WITH CHECK (is_saas_admin() OR is_admin_optimized());
