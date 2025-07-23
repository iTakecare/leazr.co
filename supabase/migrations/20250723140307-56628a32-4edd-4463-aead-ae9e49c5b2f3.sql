-- Nettoyer les politiques RLS conflictuelles sur la table ambassadors
DROP POLICY IF EXISTS "ambassadors_company_isolation" ON public.ambassadors;
DROP POLICY IF EXISTS "ambassadors_read_check" ON public.ambassadors;
DROP POLICY IF EXISTS "ambassadors_strict_company_isolation" ON public.ambassadors;
DROP POLICY IF EXISTS "ambassadors_access" ON public.ambassadors;
DROP POLICY IF EXISTS "ambassadors_debug_access" ON public.ambassadors;
DROP POLICY IF EXISTS "Allow all authenticated users to view ambassadors" ON public.ambassadors;
DROP POLICY IF EXISTS "Allow all authenticated users to manage ambassadors" ON public.ambassadors;

-- Créer une seule politique simple et claire pour les ambassadors
CREATE POLICY "ambassadors_company_access" 
ON public.ambassadors 
FOR ALL 
USING (
  -- L'utilisateur doit être authentifié
  auth.uid() IS NOT NULL AND
  (
    -- L'ambassadeur appartient à la même entreprise que l'utilisateur OU
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
    -- L'utilisateur est admin OU  
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) OR
    -- L'ambassadeur est l'utilisateur lui-même
    user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
);

-- Nettoyer les politiques RLS conflictuelles sur la table leasers
DROP POLICY IF EXISTS "leasers_strict_company_isolation" ON public.leasers;
DROP POLICY IF EXISTS "leasers_company_access" ON public.leasers;
DROP POLICY IF EXISTS "leasers_company_isolation" ON public.leasers;
DROP POLICY IF EXISTS "leasers_public_access" ON public.leasers;

-- Créer une seule politique simple et claire pour les leasers
CREATE POLICY "leasers_company_access" 
ON public.leasers 
FOR ALL 
USING (
  -- L'utilisateur doit être authentifié
  auth.uid() IS NOT NULL AND
  (
    -- Le leaser appartient à la même entreprise que l'utilisateur OU
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
    -- L'utilisateur est admin
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
);