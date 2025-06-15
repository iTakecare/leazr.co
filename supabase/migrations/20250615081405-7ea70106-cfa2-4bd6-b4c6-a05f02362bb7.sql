-- Supprimer l'ancienne fonction et la recréer avec le bon type
DROP FUNCTION IF EXISTS public.get_company_users(uuid, text);

-- Recréer la fonction avec le bon type pour l'email
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
    AND (role_filter IS NULL OR p.role = role_filter)
  ORDER BY au.created_at DESC;
END;
$$;