-- Diagnostic function to check authentication context
CREATE OR REPLACE FUNCTION public.diagnose_api_key_context()
RETURNS TABLE(
  user_id uuid,
  company_id uuid,
  user_role text,
  is_admin boolean,
  has_company_access boolean,
  checked_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_company_id uuid;
  current_user_role text;
  admin_status boolean;
BEGIN
  -- Get current user's company ID
  current_user_company_id := get_user_company_id();
  
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Check admin status
  admin_status := is_admin_optimized();
  
  RETURN QUERY
  SELECT 
    auth.uid() as user_id,
    current_user_company_id as company_id,
    current_user_role as user_role,
    admin_status as is_admin,
    (current_user_company_id IS NOT NULL) as has_company_access,
    now() as checked_at;
END;
$$;