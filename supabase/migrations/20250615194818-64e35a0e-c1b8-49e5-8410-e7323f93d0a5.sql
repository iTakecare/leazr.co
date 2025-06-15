
-- Vérifier et supprimer tous les triggers sur site_settings qui pourraient référencer la table users
DO $$ 
DECLARE
    trigger_name text;
BEGIN
    -- Supprimer tous les triggers sur site_settings
    FOR trigger_name IN 
        SELECT tgname FROM pg_trigger 
        WHERE tgrelid = 'public.site_settings'::regclass
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.site_settings CASCADE', trigger_name);
    END LOOP;
END $$;

-- Supprimer toutes les politiques RLS sur site_settings
DO $$ 
DECLARE
    pol_name text;
BEGIN
    FOR pol_name IN SELECT policyname FROM pg_policies WHERE tablename = 'site_settings' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol_name || '" ON public.site_settings';
    END LOOP;
END $$;

-- Désactiver RLS sur site_settings pour permettre l'accès libre
ALTER TABLE public.site_settings DISABLE ROW LEVEL SECURITY;

-- Créer une politique simple qui permet tout accès sans référence à auth.users
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Politique ultra-simple qui permet tout accès
CREATE POLICY "Allow all access to site_settings" 
ON public.site_settings 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- S'assurer qu'il n'y a pas de contraintes FK vers auth.users
DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN 
        SELECT conname FROM pg_constraint 
        WHERE conrelid = 'public.site_settings'::regclass 
        AND confrelid = 'auth.users'::regclass
    LOOP
        EXECUTE format('ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_name);
    END LOOP;
END $$;
