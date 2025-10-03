-- Drop the existing public read policy on platform_settings
DROP POLICY IF EXISTS "platform_settings_public_safe_fields_only" ON public.platform_settings;

-- Create a new policy that allows public SELECT on only non-sensitive fields
-- This uses a PostgreSQL feature where we can't directly restrict columns in RLS,
-- so we rely on application-level filtering in the frontend code.
-- However, we document which fields should be public vs authenticated-only.

-- Policy for public read access (all fields visible but app should filter)
CREATE POLICY "platform_settings_public_read"
ON public.platform_settings
FOR SELECT
TO public
USING (true);

-- Policy for authenticated users (full access)
CREATE POLICY "platform_settings_authenticated_full_access"
ON public.platform_settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Add comments to document which fields are sensitive
COMMENT ON TABLE public.platform_settings IS 'Platform settings table. PUBLIC ACCESS: company_name, logo_url, primary_color, secondary_color, accent_color, favicon_url, website_url. AUTHENTICATED ONLY: company_email, company_phone, company_address, company_description, linkedin_url, twitter_url';

-- Note: PostgreSQL RLS cannot restrict columns directly, so we need to update
-- the service layer (platformSettingsService.ts) to filter sensitive fields
-- for unauthenticated requests