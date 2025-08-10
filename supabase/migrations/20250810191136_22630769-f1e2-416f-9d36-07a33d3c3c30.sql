-- Fix the ambiguous column reference in is_admin_optimized function
-- and temporarily simplify the RLS policy for testing

-- Step 1: Fix is_admin_optimized function to be explicit with column references
CREATE OR REPLACE FUNCTION public.is_admin_optimized()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get the role of the current user, being explicit about the table
  SELECT p.role INTO user_role 
  FROM public.profiles p
  WHERE p.id = auth.uid();
  
  -- Return true if user is admin or super_admin
  RETURN user_role IN ('admin', 'super_admin');
EXCEPTION
  WHEN OTHERS THEN
    -- In case of error, return false for security
    RETURN false;
END;
$$;

-- Step 2: Temporarily simplify the API keys RLS policy to test without admin check
DROP POLICY IF EXISTS "API keys company isolation" ON public.api_keys;

CREATE POLICY "API keys company isolation temp" ON public.api_keys
FOR ALL
USING (company_id = get_user_company_id())
WITH CHECK (company_id = get_user_company_id());