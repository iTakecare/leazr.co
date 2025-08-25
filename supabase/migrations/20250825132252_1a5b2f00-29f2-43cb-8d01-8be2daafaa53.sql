-- Sécurisation de la table platform_settings
-- Supprimer la politique publique dangereuse qui expose toutes les données

-- Étape 1: Supprimer la politique existante qui expose tout publiquement
DROP POLICY IF EXISTS "platform_settings_public_read" ON public.platform_settings;
DROP POLICY IF EXISTS "platform_settings_public_access" ON public.platform_settings;

-- Étape 2: Créer une vue publique sûre avec seulement les champs d'affichage
CREATE OR REPLACE VIEW public.public_platform_settings AS
SELECT 
  id,
  company_name,
  logo_url,
  favicon_url,
  primary_color,
  secondary_color,
  accent_color,
  website_url,
  linkedin_url,
  twitter_url,
  created_at,
  updated_at
FROM public.platform_settings;

-- Étape 3: Permettre l'accès public en lecture seule à la vue sûre
GRANT SELECT ON public.public_platform_settings TO anon, authenticated;

-- Étape 4: Créer des politiques RLS restrictives pour la table principale
CREATE POLICY "platform_settings_admin_full_access"
ON public.platform_settings
FOR ALL
TO public
USING (
  -- Seuls les super-admins peuvent accéder à toutes les données sensibles
  is_saas_admin()
)
WITH CHECK (
  is_saas_admin()
);

-- Étape 5: Politique pour l'accès public limité (redirection vers la vue)
-- Cette politique n'autorise AUCUN accès direct à la table pour les non-admins
-- Forcer l'utilisation de la vue publique

-- Étape 6: S'assurer que RLS est activé
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;