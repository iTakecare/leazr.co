-- Supprimer la politique qui donne accès public à tous les leasers
DROP POLICY IF EXISTS "leasers_public_access" ON public.leasers;

-- Supprimer les politiques redondantes et garder seulement la politique d'isolation stricte
DROP POLICY IF EXISTS "leasers_company_access" ON public.leasers;
DROP POLICY IF EXISTS "leasers_company_isolation" ON public.leasers;

-- Créer une seule politique claire pour l'isolation par entreprise
CREATE POLICY "leasers_strict_company_isolation" ON public.leasers
FOR ALL USING (
  (get_user_company_id() IS NOT NULL) AND 
  ((company_id = get_user_company_id()) OR is_admin_optimized())
)
WITH CHECK (
  (get_user_company_id() IS NOT NULL) AND 
  ((company_id = get_user_company_id()) OR is_admin_optimized())
);