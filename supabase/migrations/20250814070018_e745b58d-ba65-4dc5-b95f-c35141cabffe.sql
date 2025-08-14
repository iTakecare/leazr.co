-- Fix platform_settings to allow public read access for logo visibility
-- Drop the restrictive read policy
DROP POLICY IF EXISTS "platform_settings_auth_read" ON public.platform_settings;

-- Create public read policy - platform branding info should be publicly visible
CREATE POLICY "platform_settings_public_read" ON public.platform_settings
FOR SELECT
TO public
USING (true);

-- The write policies remain secure (only is_saas_admin() can write)

-- Update audit log
INSERT INTO public.admin_pending_requests (
  user_id,
  client_name, 
  status,
  equipment_description,
  created_at,
  updated_at
) VALUES (
  auth.uid(),
  'SECURITY_FIX_UPDATE',
  'completed', 
  'Made platform_settings publicly readable to fix logo visibility on public pages',
  now(),
  now()
);