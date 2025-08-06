-- Fix the last function with mixed search_path
CREATE OR REPLACE FUNCTION public.get_company_users()
RETURNS TABLE(id uuid, email text, first_name text, last_name text, role text, company_id uuid, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    au.email,
    p.first_name,
    p.last_name,
    p.role,
    p.company_id,
    p.created_at
  FROM public.profiles p
  JOIN auth.users au ON p.id = au.id
  WHERE p.company_id = get_user_company_id()
  ORDER BY p.created_at DESC;
END;
$function$;