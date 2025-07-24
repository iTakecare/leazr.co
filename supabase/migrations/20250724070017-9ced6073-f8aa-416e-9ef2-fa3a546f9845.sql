-- Supprimer toutes les politiques RLS existantes sur woocommerce_configs
DROP POLICY IF EXISTS "woocommerce_configs_company_isolation" ON public.woocommerce_configs;
DROP POLICY IF EXISTS "woocommerce_configs_user_access" ON public.woocommerce_configs;
DROP POLICY IF EXISTS "woocommerce_configs_admin_access" ON public.woocommerce_configs;
DROP POLICY IF EXISTS "woocommerce_configs_access" ON public.woocommerce_configs;

-- Créer une seule politique RLS unifiée qui fonctionne avec l'authentification actuelle
CREATE POLICY "woocommerce_configs_unified_access" 
ON public.woocommerce_configs 
FOR ALL 
USING (
  -- L'utilisateur peut accéder aux configs de son entreprise
  (company_id = get_user_company_id()) OR 
  -- Ou si get_user_company_id() échoue, utiliser le user_id directement
  (user_id = auth.uid()) OR
  -- Ou si c'est un admin
  is_admin_optimized()
)
WITH CHECK (
  -- Pour l'insertion/modification, même logique
  (company_id = get_user_company_id()) OR 
  (user_id = auth.uid()) OR
  is_admin_optimized()
);