-- OPTIMISATION 7: Désactiver RLS sur les tables CMS et système

-- Désactiver RLS sur toutes les tables CMS et de configuration
ALTER TABLE public.blog_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_cms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_cms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus_cms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_cms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages_cms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.steps_cms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.woocommerce_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs DISABLE ROW LEVEL SECURITY;

-- Nettoyer toutes les politiques existantes sur ces tables
DO $$
DECLARE
    table_names text[] := ARRAY[
        'blog_posts', 'content_cms', 'hero_cms', 'menus_cms', 'meta_cms', 
        'pages_cms', 'steps_cms', 'site_settings', 'modules', 'company_modules',
        'subscriptions', 'permissions', 'permission_profiles', 'user_permissions',
        'woocommerce_configs', 'error_logs'
    ];
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