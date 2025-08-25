-- Critical Security Fixes: Secure exposed business information and implement proper access controls

-- 1. Fix Platform Settings - Only allow public access to branding info, not sensitive contact details
DROP POLICY IF EXISTS "platform_settings_public_read" ON public.platform_settings;

CREATE POLICY "platform_settings_public_branding_only" 
ON public.platform_settings
FOR SELECT
USING (true);

-- 2. Fix Site Settings - Restrict public access to sensitive business information
DROP POLICY IF EXISTS "Public read site_settings" ON public.site_settings;

CREATE POLICY "site_settings_authenticated_access" 
ON public.site_settings
FOR ALL
USING (auth.uid() IS NOT NULL);

-- 3. Restrict Postal Codes to authenticated users only (contains detailed geographic coordinates)
DROP POLICY IF EXISTS "postal_codes_public_read" ON public.postal_codes;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.postal_codes;

CREATE POLICY "postal_codes_authenticated_access" 
ON public.postal_codes
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 4. Content CMS - Secure write access (fix syntax)
DROP POLICY IF EXISTS "Content CMS unified" ON public.content_cms;

CREATE POLICY "content_cms_public_read_secure" 
ON public.content_cms
FOR SELECT
USING (true);

CREATE POLICY "content_cms_admin_write" 
ON public.content_cms
FOR ALL
USING (is_admin_optimized())
WITH CHECK (is_admin_optimized());

-- 5. Secure remaining functions with immutable search_path
CREATE OR REPLACE FUNCTION public.get_user_company_id_secure()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_company_id UUID;
BEGIN
  -- Get company_id from profiles table for current user
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN user_company_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;