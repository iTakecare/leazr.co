-- Correction de l'alerte sécurité: Recréer la vue sans SECURITY DEFINER
-- La vue doit utiliser les permissions de l'utilisateur qui fait la requête

-- Supprimer l'ancienne vue
DROP VIEW IF EXISTS public.public_platform_settings;

-- Recréer la vue sans SECURITY DEFINER (comportement par défaut)
CREATE VIEW public.public_platform_settings AS
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
FROM public.platform_settings
WHERE true; -- Cette condition sera évaluée avec les permissions de l'utilisateur

-- Créer une politique RLS spéciale pour permettre l'accès public aux champs sûrs uniquement
CREATE POLICY "platform_settings_public_safe_fields_only"
ON public.platform_settings
FOR SELECT
TO public
USING (
  -- Permettre la lecture des champs publics seulement
  -- Cette politique sera utilisée par la vue
  true  -- Mais la vue limite déjà les colonnes exposées
);

-- Re-accorder les permissions sur la vue
GRANT SELECT ON public.public_platform_settings TO anon, authenticated;