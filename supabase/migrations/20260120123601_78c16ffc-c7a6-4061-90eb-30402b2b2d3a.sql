-- Create a SECURITY DEFINER function to allow public access to platform branding
-- This bypasses RLS safely by only exposing non-sensitive public fields

CREATE OR REPLACE FUNCTION public.get_public_platform_branding()
RETURNS TABLE (
  id uuid,
  company_name text,
  logo_url text,
  primary_color text,
  secondary_color text,
  accent_color text,
  website_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.company_name::text,
    ps.logo_url::text,
    ps.primary_color::text,
    ps.secondary_color::text,
    ps.accent_color::text,
    ps.website_url::text
  FROM platform_settings ps
  LIMIT 1;
END;
$$;

-- Grant execute permission to both anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.get_public_platform_branding() TO anon, authenticated;