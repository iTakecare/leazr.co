-- OPTIMISATION 2: Nettoyage complet des politiques RLS sur offers
-- D'abord, désactiver RLS pour permettre le nettoyage complet
ALTER TABLE public.offers DISABLE ROW LEVEL SECURITY;

-- Supprimer TOUTES les politiques existantes sur offers
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'offers'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.offers';
    END LOOP;
END $$;

-- Réactiver RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Créer des politiques RLS simplifiées et optimisées pour offers
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

-- 3. Accès pour les utilisateurs propriétaires
CREATE POLICY "Users can manage their own offers" ON public.offers
FOR ALL USING (
  user_id = auth.uid()
) WITH CHECK (
  user_id = auth.uid()
);

-- 4. Lecture publique pour les offres signées
CREATE POLICY "Public can view signed offers" ON public.offers
FOR SELECT USING (
  workflow_status = 'sent' OR workflow_status = 'approved'
);