-- CRITICAL Security Fix: Remove public access to permissions and permission_profiles tables
-- This prevents exposure of the complete security model and permission structure to attackers

-- Remove overly permissive public read policies that expose security architecture
DROP POLICY IF EXISTS "permissions_read_all" ON public.permissions;
DROP POLICY IF EXISTS "permission_profiles_read_all" ON public.permission_profiles;

-- Ensure proper RLS is enabled on both tables
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_profiles ENABLE ROW LEVEL SECURITY;

-- Create secure policies that only allow admin access to permissions data
-- These tables should only be accessible to authenticated admin users

-- Policy for permissions table - admin only access
CREATE POLICY "permissions_admin_only_access" 
ON public.permissions 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles  
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Policy for permission_profiles table - admin only access
CREATE POLICY "permission_profiles_admin_only_access"
ON public.permission_profiles
FOR ALL
TO authenticated  
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Add security comments to document the critical nature of these tables
COMMENT ON TABLE public.permissions IS 'SENSITIVE: Contains application permission definitions. Admin access only.';
COMMENT ON TABLE public.permission_profiles IS 'SENSITIVE: Contains permission profile configurations. Admin access only.';

-- Clean up any existing overly permissive admin policies that check raw_user_meta_data
-- These should use the profiles table for better security
DROP POLICY IF EXISTS "Admin only permissions" ON public.permissions;
DROP POLICY IF EXISTS "Admin only permission_profiles" ON public.permission_profiles;