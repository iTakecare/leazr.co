
-- Supprimer les politiques RLS existantes sur la table contracts
DROP POLICY IF EXISTS "contracts_company_access" ON public.contracts;
DROP POLICY IF EXISTS "contracts_access" ON public.contracts;

-- Créer une nouvelle politique RLS simplifiée pour la table contracts
CREATE POLICY "contracts_company_access" ON public.contracts
FOR ALL USING (
  -- Les utilisateurs peuvent accéder aux contrats de leur company
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
  OR
  -- Les admins peuvent accéder à tous les contrats
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' IN ('admin', 'super_admin')
  )
);
