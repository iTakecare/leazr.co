-- OPTIMISATION 5: Nettoyage des tables restantes
-- Nettoyer les politiques sur products
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.products';
    END LOOP;
END $$;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to products" ON public.products
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Company members can manage their products" ON public.products
FOR ALL USING (
  company_id = get_user_company_id()
) WITH CHECK (
  company_id = get_user_company_id()
);
CREATE POLICY "Public can view active products" ON public.products
FOR SELECT USING (
  active = true AND admin_only = false
);

-- Nettoyer les politiques sur profiles
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.profiles';
    END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view and update their own profile" ON public.profiles
FOR ALL USING (
  id = auth.uid()
) WITH CHECK (
  id = auth.uid()
);
CREATE POLICY "Admin full access to profiles" ON public.profiles
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Désactiver RLS sur les tables système qui ne devraient pas en avoir
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_levels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules DISABLE ROW LEVEL SECURITY;