-- Rétablir les politiques RLS normales pour les ambassadeurs
-- La politique de debug temporaire va être remplacée par une politique stricte

-- Supprimer la politique de debug temporaire
DROP POLICY IF EXISTS "ambassadors_debug_access" ON public.ambassadors;

-- Créer une politique RLS stricte basée sur l'isolation par entreprise
CREATE POLICY "ambassadors_company_isolation" 
ON public.ambassadors 
FOR ALL 
USING (
  -- L'utilisateur doit être authentifié ET appartenir à la même entreprise
  (auth.uid() IS NOT NULL) AND 
  ((company_id = get_user_company_id()) OR is_admin_optimized())
)
WITH CHECK (
  -- Pour les modifications, même logique
  (auth.uid() IS NOT NULL) AND 
  ((company_id = get_user_company_id()) OR is_admin_optimized())
);