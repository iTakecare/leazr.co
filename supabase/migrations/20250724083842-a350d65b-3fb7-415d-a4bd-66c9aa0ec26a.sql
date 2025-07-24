-- Fix the get_user_company_id function to work properly with RLS
-- Instead of using get_current_user_profile, directly query the profiles table

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
BEGIN
  -- Direct query to profiles table using auth.uid()
  RETURN (
    SELECT company_id 
    FROM public.profiles 
    WHERE id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Also simplify get_current_user_profile to avoid any recursion issues
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS TABLE(user_id UUID, company_id UUID, role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.company_id,
    p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;