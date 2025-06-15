-- OPTIMISATION 4: Nettoyage complet des politiques RLS sur toutes les tables problématiques
-- Nettoyer les politiques sur ambassadors
ALTER TABLE public.ambassadors DISABLE ROW LEVEL SECURITY;
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ambassadors'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.ambassadors';
    END LOOP;
END $$;

ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to ambassadors" ON public.ambassadors
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Company members can manage their ambassadors" ON public.ambassadors
FOR ALL USING (
  company_id = get_user_company_id()
) WITH CHECK (
  company_id = get_user_company_id()
);

-- Nettoyer les politiques sur partners
ALTER TABLE public.partners DISABLE ROW LEVEL SECURITY;
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'partners'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.partners';
    END LOOP;
END $$;

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to partners" ON public.partners
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Company members can manage their partners" ON public.partners
FOR ALL USING (
  company_id = get_user_company_id()
) WITH CHECK (
  company_id = get_user_company_id()
);

-- Nettoyer les politiques sur contracts
ALTER TABLE public.contracts DISABLE ROW LEVEL SECURITY;
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contracts'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.contracts';
    END LOOP;
END $$;

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to contracts" ON public.contracts
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Company members can manage their contracts" ON public.contracts
FOR ALL USING (
  company_id = get_user_company_id()
) WITH CHECK (
  company_id = get_user_company_id()
);

-- Nettoyer les politiques sur leasers
ALTER TABLE public.leasers DISABLE ROW LEVEL SECURITY;
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leasers'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.leasers';
    END LOOP;
END $$;

ALTER TABLE public.leasers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to leasers" ON public.leasers
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Company members can manage their leasers" ON public.leasers
FOR ALL USING (
  company_id = get_user_company_id()
) WITH CHECK (
  company_id = get_user_company_id()
);