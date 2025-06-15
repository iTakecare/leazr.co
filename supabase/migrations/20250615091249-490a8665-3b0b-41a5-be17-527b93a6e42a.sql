-- OPTIMISATION 5: Finaliser le nettoyage des politiques RLS restantes

-- Désactiver RLS sur les tables système qui n'ont pas besoin de politiques complexes
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_levels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates DISABLE ROW LEVEL SECURITY;

-- Nettoyer les politiques sur les tables restantes
DO $$
DECLARE
    table_names text[] := ARRAY['categories', 'brands', 'commission_levels', 'commission_rates', 'permissions', 'permission_profiles', 'modules', 'pdf_templates', 'email_templates'];
    table_name text;
    policy_record RECORD;
BEGIN
    FOREACH table_name IN ARRAY table_names
    LOOP
        FOR policy_record IN 
            EXECUTE format('SELECT policyname FROM pg_policies WHERE schemaname = ''public'' AND tablename = %L', table_name)
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.%I', policy_record.policyname, table_name);
        END LOOP;
    END LOOP;
END $$;

-- Nettoyer les politiques sur profiles et recréer des politiques simples
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

-- Politique simple pour les profiles - éviter la récursion
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE au.id = auth.uid() 
    AND au.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can manage all profiles" ON public.profiles
FOR ALL USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE au.id = auth.uid() 
    AND au.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
  )
);