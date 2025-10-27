-- Remove public read access from platform_settings table
-- This table contains company contact information, branding, and internal configuration
-- that should only be accessible to authenticated users

DROP POLICY IF EXISTS "platform_settings_public_read" ON public.platform_settings;

-- The following policies already exist and provide proper access control:
-- 1. platform_settings_authenticated_full_access: Allows authenticated users to read/write
-- 2. platform_settings_admin_manage: Allows SAAS admins full control

-- Verify RLS is enabled (it should already be)
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.platform_settings IS 'Platform configuration settings - restricted to authenticated users only';