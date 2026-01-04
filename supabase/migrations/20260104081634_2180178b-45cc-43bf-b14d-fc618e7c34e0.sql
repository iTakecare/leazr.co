-- Recréer la fonction get_company_users en excluant les ambassadeurs
DROP FUNCTION IF EXISTS public.get_company_users(UUID, TEXT);

CREATE FUNCTION public.get_company_users(p_company_id UUID, role_filter TEXT DEFAULT NULL)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  has_user_account BOOLEAN
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
    p.role,
    p.phone,
    au.created_at,
    au.last_sign_in_at,
    TRUE as has_user_account
  FROM public.profiles p
  JOIN auth.users au ON p.id = au.id
  WHERE p.company_id = p_company_id
    -- Exclure les ambassadeurs (ils ont leur propre section dédiée)
    AND p.role IN ('admin', 'super_admin', 'partner_admin', 'sales', 'commercial', 'partner')
    AND au.email != 'ecommerce@itakecare.be'
    AND (role_filter IS NULL OR p.role = role_filter)
  ORDER BY au.created_at DESC;
END;
$$;