
-- Supprimer les anciennes politiques conflictuelles sur la table offers
DROP POLICY IF EXISTS "Admin full access to offers" ON public.offers;
DROP POLICY IF EXISTS "Company members can manage their offers" ON public.offers;
DROP POLICY IF EXISTS "Users can manage their own offers" ON public.offers;
DROP POLICY IF EXISTS "Public can view signed offers" ON public.offers;
DROP POLICY IF EXISTS "Allow public offer requests" ON public.offers;

-- Créer de nouvelles politiques RLS qui permettent aux ambassadeurs de créer des offres
-- 1. Admin: accès total
CREATE POLICY "Admin full access to offers" ON public.offers
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- 2. Multi-tenant: accès par entreprise
CREATE POLICY "Company members can manage their offers" ON public.offers
FOR ALL USING (
  company_id = get_user_company_id()
) WITH CHECK (
  company_id = get_user_company_id()
);

-- 3. Utilisateurs propriétaires
CREATE POLICY "Users can manage their own offers" ON public.offers
FOR ALL USING (
  user_id = auth.uid()
) WITH CHECK (
  user_id = auth.uid()
);

-- 4. Ambassadeurs peuvent créer et gérer leurs offres
CREATE POLICY "Ambassadors can manage their offers" ON public.offers
FOR ALL USING (
  ambassador_id IN (
    SELECT id FROM public.ambassadors WHERE user_id = auth.uid()
  )
) WITH CHECK (
  ambassador_id IN (
    SELECT id FROM public.ambassadors WHERE user_id = auth.uid()
  )
);

-- 5. Lecture publique pour les offres signées
CREATE POLICY "Public can view signed offers" ON public.offers
FOR SELECT USING (
  workflow_status = 'sent' OR workflow_status = 'approved'
);

-- 6. Insertion publique pour les demandes clients
CREATE POLICY "Allow public offer requests" ON public.offers
FOR INSERT WITH CHECK (
  auth.role() = 'anon' AND type = 'client_request'
);
