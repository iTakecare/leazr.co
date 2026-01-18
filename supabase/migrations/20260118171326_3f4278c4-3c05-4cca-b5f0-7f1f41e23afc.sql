-- Fix overly permissive RLS policy on platform_settings
-- Replace full access with admin-only write access

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "platform_settings_authenticated_full_access" ON public.platform_settings;

-- Create proper read policy for all authenticated users
CREATE POLICY "platform_settings_authenticated_read" 
ON public.platform_settings 
FOR SELECT 
TO authenticated
USING (true);

-- Create admin-only write policy
CREATE POLICY "platform_settings_admin_write" 
ON public.platform_settings 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin')
  )
);