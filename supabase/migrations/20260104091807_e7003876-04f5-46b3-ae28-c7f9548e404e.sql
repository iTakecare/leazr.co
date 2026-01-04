-- Update get_company_signers function to exclude SaaS Admin
CREATE OR REPLACE FUNCTION public.get_company_signers(p_company_id UUID)
RETURNS TABLE(
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    au.email::TEXT,
    p.first_name,
    p.last_name,
    p.phone
  FROM public.profiles p
  JOIN auth.users au ON p.id = au.id
  WHERE p.company_id = p_company_id
    AND p.role IN ('admin', 'super_admin', 'partner_admin', 'sales', 'commercial')
    AND au.email != 'ecommerce@itakecare.be'
  ORDER BY p.first_name;
END;
$$;