-- MIGRATION COMPLÈTE: Nettoyage et création de politiques RLS adaptées au multi-tenant

-- 1. NETTOYAGE COMPLET
DO $$
DECLARE
    table_record RECORD;
    policy_record RECORD;
BEGIN
    -- Supprimer toutes les politiques existantes
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
    
    -- Désactiver RLS sur toutes les tables
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', table_record.tablename);
        EXCEPTION
            WHEN OTHERS THEN
                NULL;
        END;
    END LOOP;
END $$;

-- 2. FONCTIONS UTILITAIRES SÉCURISÉES
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' IN ('admin', 'super_admin')
  );
$$;

-- 3. TABLES SYSTÈME (accès admin uniquement)
-- Companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_admin_only" ON public.companies
FOR ALL USING (public.is_admin());

-- Modules  
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modules_read_all" ON public.modules
FOR SELECT USING (true);
CREATE POLICY "modules_admin_write" ON public.modules
FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "modules_admin_update" ON public.modules
FOR UPDATE USING (public.is_admin());
CREATE POLICY "modules_admin_delete" ON public.modules
FOR DELETE USING (public.is_admin());

-- Subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_admin_only" ON public.subscriptions
FOR ALL USING (public.is_admin());

-- 4. TABLES MULTI-TENANT CORE
-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own_access" ON public.profiles
FOR ALL USING (auth.uid() = id);
CREATE POLICY "profiles_admin_access" ON public.profiles
FOR ALL USING (public.is_admin());
CREATE POLICY "profiles_company_read" ON public.profiles
FOR SELECT USING (company_id = public.get_user_company_id());

-- Clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_company_access" ON public.clients
FOR ALL USING (
  company_id = public.get_user_company_id() OR public.is_admin()
);

-- Offers
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers_company_access" ON public.offers
FOR ALL USING (
  company_id = public.get_user_company_id() OR public.is_admin()
);
CREATE POLICY "offers_public_view" ON public.offers
FOR SELECT USING (
  workflow_status IN ('sent', 'approved') AND auth.uid() IS NULL
);

-- Contracts
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contracts_company_access" ON public.contracts
FOR ALL USING (
  company_id = public.get_user_company_id() OR public.is_admin()
);

-- Ambassadors
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ambassadors_company_access" ON public.ambassadors
FOR ALL USING (
  company_id = public.get_user_company_id() OR public.is_admin()
);

-- Partners
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partners_company_access" ON public.partners
FOR ALL USING (
  company_id = public.get_user_company_id() OR public.is_admin()
);

-- Leasers
ALTER TABLE public.leasers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leasers_company_access" ON public.leasers
FOR ALL USING (
  company_id = public.get_user_company_id() OR public.is_admin()
);

-- Products (accès public pour catalogue + accès company)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_company_access" ON public.products
FOR ALL USING (
  company_id = public.get_user_company_id() OR public.is_admin()
);
CREATE POLICY "products_public_catalog" ON public.products
FOR SELECT USING (
  active = true AND admin_only = false
);

-- 5. TABLES PUBLIQUES/CMS (accès lecture publique + écriture admin)
-- Blog posts
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_posts_public_read" ON public.blog_posts
FOR SELECT USING (is_published = true);
CREATE POLICY "blog_posts_admin_write" ON public.blog_posts
FOR ALL USING (public.is_admin());

-- Pages CMS
ALTER TABLE public.pages_cms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pages_cms_public_read" ON public.pages_cms
FOR SELECT USING (is_published = true);
CREATE POLICY "pages_cms_admin_write" ON public.pages_cms
FOR ALL USING (public.is_admin());

-- Site settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_settings_public_read" ON public.site_settings
FOR SELECT USING (true);
CREATE POLICY "site_settings_admin_write" ON public.site_settings
FOR ALL USING (public.is_admin());

-- Autres tables CMS
ALTER TABLE public.content_cms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_cms_public_read" ON public.content_cms
FOR SELECT USING (true);
CREATE POLICY "content_cms_admin_write" ON public.content_cms
FOR ALL USING (public.is_admin());

ALTER TABLE public.hero_cms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hero_cms_public_read" ON public.hero_cms
FOR SELECT USING (true);
CREATE POLICY "hero_cms_admin_write" ON public.hero_cms
FOR ALL USING (public.is_admin());

ALTER TABLE public.menus_cms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menus_cms_public_read" ON public.menus_cms
FOR SELECT USING (true);
CREATE POLICY "menus_cms_admin_write" ON public.menus_cms
FOR ALL USING (public.is_admin());

ALTER TABLE public.meta_cms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meta_cms_public_read" ON public.meta_cms
FOR SELECT USING (true);
CREATE POLICY "meta_cms_admin_write" ON public.meta_cms
FOR ALL USING (public.is_admin());

ALTER TABLE public.steps_cms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "steps_cms_public_read" ON public.steps_cms
FOR SELECT USING (true);
CREATE POLICY "steps_cms_admin_write" ON public.steps_cms
FOR ALL USING (public.is_admin());

-- 6. TABLES DE CONFIGURATION (accès admin/company)
-- Commission levels
ALTER TABLE public.commission_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commission_levels_read_all" ON public.commission_levels
FOR SELECT USING (true);
CREATE POLICY "commission_levels_admin_write" ON public.commission_levels
FOR ALL USING (public.is_admin());

-- Commission rates
ALTER TABLE public.commission_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commission_rates_read_all" ON public.commission_rates
FOR SELECT USING (true);
CREATE POLICY "commission_rates_admin_write" ON public.commission_rates
FOR ALL USING (public.is_admin());

-- Permissions
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissions_read_all" ON public.permissions
FOR SELECT USING (true);
CREATE POLICY "permissions_admin_write" ON public.permissions
FOR ALL USING (public.is_admin());

-- Permission profiles
ALTER TABLE public.permission_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permission_profiles_read_all" ON public.permission_profiles
FOR SELECT USING (true);
CREATE POLICY "permission_profiles_admin_write" ON public.permission_profiles
FOR ALL USING (public.is_admin());

-- User permissions
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_permissions_own_access" ON public.user_permissions
FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_permissions_admin_write" ON public.user_permissions
FOR ALL USING (public.is_admin());

-- 7. TABLES RÉFÉRENCES (lecture publique)
-- Categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_read_all" ON public.categories
FOR SELECT USING (true);
CREATE POLICY "categories_admin_write" ON public.categories
FOR ALL USING (public.is_admin());

-- Brands  
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brands_read_all" ON public.brands
FOR SELECT USING (true);
CREATE POLICY "brands_admin_write" ON public.brands
FOR ALL USING (public.is_admin());