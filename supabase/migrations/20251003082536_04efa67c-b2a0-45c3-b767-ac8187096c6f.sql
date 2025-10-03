-- Update is_admin_optimized() to use user_roles table
CREATE OR REPLACE FUNCTION public.is_admin_optimized()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'super_admin'::app_role);
$$;

-- Update is_saas_admin() to use user_roles table
CREATE OR REPLACE FUNCTION public.is_saas_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'super_admin'::app_role);
$$;

-- Create additional role check functions for convenience
CREATE OR REPLACE FUNCTION public.is_ambassador()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'ambassador'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.is_partner()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'partner'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.is_client()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'client'::app_role);
$$;

-- Add comment to document the change
COMMENT ON FUNCTION public.is_admin_optimized() IS 'Checks if current user has admin or super_admin role using user_roles table (secure against privilege escalation)';
COMMENT ON FUNCTION public.is_saas_admin() IS 'Checks if current user has super_admin role using user_roles table (secure against privilege escalation)';
COMMENT ON FUNCTION public.has_role(uuid, app_role) IS 'Security definer function to check user roles without recursive RLS issues';