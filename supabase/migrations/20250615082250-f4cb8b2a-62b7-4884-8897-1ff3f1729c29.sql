-- Modifier la fonction get_company_users pour ne retourner que les utilisateurs du logiciel
DROP FUNCTION IF EXISTS public.get_company_users(uuid, text);

CREATE OR REPLACE FUNCTION public.get_company_users(p_company_id uuid, role_filter text DEFAULT NULL::text)
RETURNS TABLE(
  user_id uuid,
  email character varying(255),
  first_name text,
  last_name text,
  role text,
  created_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  has_user_account boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    au.email,
    p.first_name,
    p.last_name,
    p.role,
    au.created_at,
    au.last_sign_in_at,
    TRUE as has_user_account
  FROM public.profiles p
  JOIN auth.users au ON p.id = au.id
  WHERE p.company_id = p_company_id
    AND p.role IN ('admin', 'super_admin')  -- Seulement les vrais utilisateurs du logiciel
    AND au.email != 'ecommerce@itakecare.be'  -- Exclure l'utilisateur SaaS
    AND (role_filter IS NULL OR p.role = role_filter)
  ORDER BY au.created_at DESC;
END;
$$;