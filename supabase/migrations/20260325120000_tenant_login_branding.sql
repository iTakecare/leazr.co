-- Ajout des champs de branding pour la page login par tenant
ALTER TABLE company_customizations
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
  ADD COLUMN IF NOT EXISTS login_title TEXT,
  ADD COLUMN IF NOT EXISTS login_subtitle TEXT;

-- Drop de l'ancienne fonction avant recréation (signature différente)
DROP FUNCTION IF EXISTS get_public_company_info(text);

-- Recréation avec les nouveaux champs
CREATE FUNCTION get_public_company_info(company_slug TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  hero_image_url TEXT,
  login_title TEXT,
  login_subtitle TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.slug,
    cc.logo_url,
    cc.primary_color,
    cc.secondary_color,
    cc.accent_color,
    cc.hero_image_url,
    cc.login_title,
    cc.login_subtitle
  FROM companies c
  LEFT JOIN company_customizations cc ON cc.company_id = c.id
  WHERE c.slug = company_slug
  LIMIT 1;
$$;
