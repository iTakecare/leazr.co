-- Fix platform_settings RLS policies to allow public access to logo and branding

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "platform_settings_admin_access" ON public.platform_settings;
DROP POLICY IF EXISTS "platform_settings_secure_access" ON public.platform_settings;

-- Allow public read access to platform branding information
CREATE POLICY "platform_settings_public_read" ON public.platform_settings
FOR SELECT 
TO public
USING (true);

-- Restrict write operations to SaaS admins only
CREATE POLICY "platform_settings_admin_write" ON public.platform_settings
FOR ALL 
TO authenticated
USING (is_saas_admin())
WITH CHECK (is_saas_admin());