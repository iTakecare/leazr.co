-- Créer la table pour les paramètres globaux de la plateforme
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL DEFAULT 'Leazr',
  company_description text,
  company_address text,
  company_phone text,
  company_email text,
  logo_url text,
  favicon_url text,
  primary_color text DEFAULT '#3b82f6',
  secondary_color text DEFAULT '#64748b', 
  accent_color text DEFAULT '#8b5cf6',
  website_url text,
  linkedin_url text,
  twitter_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.update_platform_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_platform_settings_updated_at();

-- RLS: Seuls les admins SaaS peuvent accéder
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_settings_admin_only" 
ON public.platform_settings 
FOR ALL 
USING (is_saas_admin())
WITH CHECK (is_saas_admin());

-- Insérer les paramètres par défaut
INSERT INTO public.platform_settings (
  company_name,
  company_description,
  company_email,
  logo_url,
  primary_color,
  secondary_color,
  accent_color
) VALUES (
  'Leazr',
  'Plateforme SaaS de gestion de leasing',
  'contact@leazr.co',
  '/leazr-logo.png',
  '#3b82f6',
  '#64748b',
  '#8b5cf6'
) ON CONFLICT DO NOTHING;