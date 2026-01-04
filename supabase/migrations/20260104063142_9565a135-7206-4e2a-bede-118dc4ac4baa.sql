-- Drop and recreate update_company_user function with phone parameter
CREATE OR REPLACE FUNCTION public.update_company_user(
  p_user_id UUID,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_company_id UUID DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    first_name = COALESCE(p_first_name, first_name),
    last_name = COALESCE(p_last_name, last_name),
    role = COALESCE(p_role, role),
    company_id = COALESCE(p_company_id, company_id),
    phone = COALESCE(p_phone, phone),
    updated_at = now()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;