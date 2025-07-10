-- Corriger la politique RLS des ambassadeurs pour utiliser la même logique stricte que les clients
-- Cela va bloquer l'accès si l'authentification échoue et assurer l'isolation par entreprise

-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "ambassadors_company_isolation" ON public.ambassadors;

-- Créer la nouvelle politique avec la même logique que les clients
CREATE POLICY "ambassadors_strict_company_isolation" 
ON public.ambassadors 
FOR ALL 
USING (
  -- Condition stricte: l'utilisateur doit avoir un company_id valide
  (get_user_company_id() IS NOT NULL) AND 
  (
    -- L'ambassadeur appartient à la même entreprise OU l'utilisateur est admin
    (company_id = get_user_company_id()) OR 
    is_admin_optimized()
  )
)
WITH CHECK (
  -- Pour les modifications, même logique mais sans user_id
  (get_user_company_id() IS NOT NULL) AND 
  (
    (company_id = get_user_company_id()) OR 
    is_admin_optimized()
  )
);