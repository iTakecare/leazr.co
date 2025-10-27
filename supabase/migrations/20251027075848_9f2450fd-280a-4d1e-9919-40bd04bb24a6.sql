-- Restore limited public read access to platform_settings for branding
-- Allows anonymous users to read platform branding (logo, colors, name) for public pages
-- 🔒 SECURITY: Application layer (getPublicPlatformSettings) filters sensitive fields

CREATE POLICY "platform_settings_public_branding_read" 
ON public.platform_settings
FOR SELECT 
TO anon
USING (true);

COMMENT ON POLICY "platform_settings_public_branding_read" ON public.platform_settings IS 
'Allows anonymous users to read platform branding for public pages like /login. 
Sensitive fields (email, phone, address) are filtered in application layer via getPublicPlatformSettings().';