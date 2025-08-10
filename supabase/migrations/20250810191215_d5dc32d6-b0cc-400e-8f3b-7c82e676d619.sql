-- Fix the search path security warning for get_user_company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_company_id UUID;
BEGIN
  -- Get the company_id from the profiles table for the current user
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN user_company_id;
EXCEPTION
  WHEN OTHERS THEN
    -- In case of error, return NULL
    RETURN NULL;
END;
$$;

-- Now restore the complete API keys policy with the fixed is_admin_optimized function
DROP POLICY IF EXISTS "API keys company isolation temp" ON public.api_keys;

CREATE POLICY "API keys company isolation" ON public.api_keys
FOR ALL
USING ((company_id = get_user_company_id()) OR is_admin_optimized())
WITH CHECK ((company_id = get_user_company_id()) OR is_admin_optimized());