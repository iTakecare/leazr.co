-- Créer les politiques RLS manquantes seulement

-- Politique pour la table companies - admin seulement (si elle n'existe pas)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'companies_admin_access') THEN
        EXECUTE 'CREATE POLICY "companies_admin_access" ON public.companies FOR ALL USING (public.is_admin_optimized())';
    END IF;
END $$;

-- Politique pour la table profiles - utilisateur lui-même ou admin (si elle n'existe pas)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_access') THEN
        EXECUTE 'CREATE POLICY "profiles_access" ON public.profiles FOR ALL USING (auth.uid() = id OR public.is_admin_optimized())';
    END IF;
END $$;

-- Politique pour la table clients - basée sur company_id ou admin (si elle n'existe pas)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'clients_access') THEN
        EXECUTE 'CREATE POLICY "clients_access" ON public.clients FOR ALL USING (company_id = public.get_user_company_id() OR public.is_admin_optimized())';
    END IF;
END $$;

-- Politique pour la table offers - basée sur company_id ou admin (si elle n'existe pas)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'offers' AND policyname = 'offers_access') THEN
        EXECUTE 'CREATE POLICY "offers_access" ON public.offers FOR ALL USING (company_id = public.get_user_company_id() OR public.is_admin_optimized())';
    END IF;
END $$;

-- Politique pour la table ambassadors - basée sur company_id ou admin (si elle n'existe pas)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ambassadors' AND policyname = 'ambassadors_access') THEN
        EXECUTE 'CREATE POLICY "ambassadors_access" ON public.ambassadors FOR ALL USING (company_id = public.get_user_company_id() OR public.is_admin_optimized())';
    END IF;
END $$;

-- Politique pour la table partners - basée sur company_id ou admin (si elle n'existe pas)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'partners' AND policyname = 'partners_access') THEN
        EXECUTE 'CREATE POLICY "partners_access" ON public.partners FOR ALL USING (company_id = public.get_user_company_id() OR public.is_admin_optimized())';
    END IF;
END $$;

-- Politique pour la table leasers - basée sur company_id ou admin (si elle n'existe pas)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leasers' AND policyname = 'leasers_access') THEN
        EXECUTE 'CREATE POLICY "leasers_access" ON public.leasers FOR ALL USING (company_id = public.get_user_company_id() OR public.is_admin_optimized())';
    END IF;
END $$;

-- Politiques pour la table products (si elles n'existent pas)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'products_read_access') THEN
        EXECUTE 'CREATE POLICY "products_read_access" ON public.products FOR SELECT USING (active = true OR company_id = public.get_user_company_id() OR public.is_admin_optimized())';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'products_write_access') THEN
        EXECUTE 'CREATE POLICY "products_write_access" ON public.products FOR INSERT WITH CHECK (company_id = public.get_user_company_id() OR public.is_admin_optimized())';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'products_update_access') THEN
        EXECUTE 'CREATE POLICY "products_update_access" ON public.products FOR UPDATE USING (company_id = public.get_user_company_id() OR public.is_admin_optimized())';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'products_delete_access') THEN
        EXECUTE 'CREATE POLICY "products_delete_access" ON public.products FOR DELETE USING (company_id = public.get_user_company_id() OR public.is_admin_optimized())';
    END IF;
END $$;