-- Create a public view with ONLY non-sensitive columns
-- This view will be used for anonymous/public access
CREATE VIEW public.platform_settings_public
WITH (security_invoker = on) AS
  SELECT 
    id,
    company_name,
    logo_url,
    primary_color,
    secondary_color,
    accent_color,
    website_url,
    created_at,
    updated_at
  FROM public.platform_settings;
  -- Excludes: company_description, company_email, company_phone, company_address

COMMENT ON VIEW public.platform_settings_public IS 
'Public view of platform_settings exposing only branding data. Sensitive fields (email, phone, address, description) are excluded for security.';

-- Drop the overly permissive anonymous policy on base table
DROP POLICY IF EXISTS "platform_settings_public_branding_read" ON public.platform_settings;

-- Create policy for anonymous to read the PUBLIC VIEW only
-- The base table is now protected - anon can only access via the view
CREATE POLICY "platform_settings_public_view_read"
ON public.platform_settings
FOR SELECT
TO anon
USING (false);

-- Note: Authenticated users keep their existing read access via platform_settings_authenticated_read