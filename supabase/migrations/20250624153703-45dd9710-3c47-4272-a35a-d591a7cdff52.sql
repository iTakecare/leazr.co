
-- Étape 1: Nettoyer TOUTES les anciennes politiques RLS sur email_templates et smtp_settings uniquement
DO $$ 
DECLARE
    pol_name text;
BEGIN
    -- Supprimer toutes les politiques de la table email_templates
    FOR pol_name IN SELECT policyname FROM pg_policies WHERE tablename = 'email_templates' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol_name || '" ON public.email_templates';
    END LOOP;
    
    -- Supprimer toutes les politiques de la table smtp_settings
    FOR pol_name IN SELECT policyname FROM pg_policies WHERE tablename = 'smtp_settings' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol_name || '" ON public.smtp_settings';
    END LOOP;
END $$;

-- Étape 2: Créer une nouvelle fonction is_admin_v2() qui utilise la table profiles
CREATE OR REPLACE FUNCTION public.is_admin_v2()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
$$;

-- Étape 3: Créer une fonction is_admin_or_ambassador_v2() qui utilise la table profiles  
CREATE OR REPLACE FUNCTION public.is_admin_or_ambassador_v2()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'ambassador')
  );
$$;

-- Étape 4: Recréer les politiques RLS proprement pour email_templates
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Permettre aux admins et ambassadeurs de lire les templates d'email
CREATE POLICY "read_email_templates_policy" ON public.email_templates
FOR SELECT USING (public.is_admin_or_ambassador_v2());

-- Permettre seulement aux admins de modifier les templates
CREATE POLICY "manage_email_templates_policy" ON public.email_templates
FOR ALL USING (public.is_admin_v2());

-- Étape 5: Recréer les politiques RLS proprement pour smtp_settings
ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;

-- Permettre aux admins et ambassadeurs de lire les paramètres SMTP
CREATE POLICY "read_smtp_settings_policy" ON public.smtp_settings
FOR SELECT USING (public.is_admin_or_ambassador_v2());

-- Permettre seulement aux admins de modifier les paramètres SMTP
CREATE POLICY "manage_smtp_settings_policy" ON public.smtp_settings
FOR ALL USING (public.is_admin_v2());
