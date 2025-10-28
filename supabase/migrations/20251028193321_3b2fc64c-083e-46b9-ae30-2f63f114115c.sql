-- Correction de l'isolation des données pour la table offers
-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "offers_admin_only_temp" ON public.offers;
DROP POLICY IF EXISTS "offers_company_isolation" ON public.offers;

-- Créer une nouvelle politique stricte qui respecte l'isolation par company_id
CREATE POLICY "offers_company_isolation"
ON public.offers
FOR ALL
USING (
  -- Les admins et super_admins peuvent voir les offres de LEUR company uniquement
  (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND p.company_id = offers.company_id
    )
  )
  OR
  -- Les clients peuvent voir leurs propres offres
  (
    auth.uid() IS NOT NULL
    AND client_id IN (
      SELECT c.id FROM public.clients c WHERE c.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  -- Pour les INSERT/UPDATE, vérifier que le company_id correspond au company de l'utilisateur
  company_id = (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);