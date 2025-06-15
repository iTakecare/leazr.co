-- Supprimer toutes les politiques RLS existantes qui pourraient causer des problèmes

-- Supprimer les politiques de toutes les tables concernées
DO $$ 
DECLARE
    pol_name text;
BEGIN
    -- Supprimer toutes les politiques de la table companies
    FOR pol_name IN SELECT policyname FROM pg_policies WHERE tablename = 'companies' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol_name || '" ON public.companies';
    END LOOP;
    
    -- Supprimer toutes les politiques de la table profiles
    FOR pol_name IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol_name || '" ON public.profiles';
    END LOOP;
    
    -- Supprimer toutes les politiques de la table clients
    FOR pol_name IN SELECT policyname FROM pg_policies WHERE tablename = 'clients' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol_name || '" ON public.clients';
    END LOOP;
    
    -- Supprimer toutes les politiques de la table offers
    FOR pol_name IN SELECT policyname FROM pg_policies WHERE tablename = 'offers' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol_name || '" ON public.offers';
    END LOOP;
    
    -- Supprimer toutes les politiques de la table products
    FOR pol_name IN SELECT policyname FROM pg_policies WHERE tablename = 'products' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol_name || '" ON public.products';
    END LOOP;
END $$;