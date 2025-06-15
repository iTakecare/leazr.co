-- NETTOYAGE FINAL: Supprimer toutes les politiques RLS et désactiver RLS uniquement sur les tables (pas les vues)

DO $$
DECLARE
    table_record RECORD;
    policy_record RECORD;
BEGIN
    -- Supprimer toutes les politiques sur toutes les tables ET vues
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        UNION
        SELECT schemaname, viewname as tablename
        FROM pg_views
        WHERE schemaname = 'public'
    LOOP
        FOR policy_record IN 
            EXECUTE format('SELECT policyname FROM pg_policies WHERE schemaname = %L AND tablename = %L', 
                         table_record.schemaname, table_record.tablename)
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.%I', 
                         policy_record.policyname, table_record.tablename);
        END LOOP;
    END LOOP;
    
    -- Désactiver RLS sur toutes les tables (pas les vues)
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', table_record.tablename);
        EXCEPTION
            WHEN OTHERS THEN
                -- Ignorer toute erreur
                NULL;
        END;
    END LOOP;
END $$;

-- Réactiver RLS et créer des politiques simples uniquement sur les tables critiques
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_access" ON public.profiles FOR ALL USING (
  auth.uid() = id OR 
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_access" ON public.clients FOR ALL USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers_access" ON public.offers FOR ALL USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contracts_access" ON public.contracts FOR ALL USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ambassadors_access" ON public.ambassadors FOR ALL USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partners_access" ON public.partners FOR ALL USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

ALTER TABLE public.leasers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leasers_access" ON public.leasers FOR ALL USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_access" ON public.products FOR ALL USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin')) OR
  (active = true AND admin_only = false)
);