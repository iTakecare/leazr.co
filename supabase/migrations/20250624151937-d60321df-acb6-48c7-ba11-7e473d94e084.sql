
-- Supprimer les anciennes politiques RLS qui causent des problèmes de permissions
DROP POLICY IF EXISTS "Admin access to email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admin access to smtp settings" ON public.smtp_settings;
DROP POLICY IF EXISTS "Users can view email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Users can manage email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Users can view smtp settings" ON public.smtp_settings;
DROP POLICY IF EXISTS "Users can manage smtp settings" ON public.smtp_settings;

-- Activer RLS sur les tables si ce n'est pas déjà fait
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;

-- Créer de nouvelles politiques RLS corrigées pour email_templates
-- Permettre aux admins et ambassadeurs de lire les templates (nécessaire pour l'envoi d'emails)
CREATE POLICY "admins_and_ambassadors_can_read_email_templates" ON public.email_templates
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'ambassador')
  )
);

-- Permettre seulement aux admins de modifier les templates
CREATE POLICY "admins_can_manage_email_templates" ON public.email_templates
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Créer de nouvelles politiques RLS corrigées pour smtp_settings
-- Permettre aux admins et ambassadeurs de lire les paramètres SMTP (nécessaire pour l'envoi d'emails)
CREATE POLICY "admins_and_ambassadors_can_read_smtp_settings" ON public.smtp_settings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'ambassador')
  )
);

-- Permettre seulement aux admins de modifier les paramètres SMTP
CREATE POLICY "admins_can_manage_smtp_settings" ON public.smtp_settings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);
