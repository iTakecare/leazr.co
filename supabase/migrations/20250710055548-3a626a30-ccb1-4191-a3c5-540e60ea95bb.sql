-- Ajouter une politique RLS alternative pour les ambassadeurs qui fonctionne même si get_user_company_id() est NULL
-- Cette politique utilise la même logique que clients_access qui fonctionne déjà

CREATE POLICY "ambassadors_access" 
ON public.ambassadors 
FOR ALL 
USING (
  -- Politique alternative qui fonctionne même si get_user_company_id() retourne NULL
  (company_id = get_user_company_id()) OR is_admin_optimized()
);