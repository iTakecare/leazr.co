-- Fix the remaining functions with mutable search path
-- Based on the existing functions in the schema, let's fix common ones that likely need search_path

-- Fix check_user_exists_by_email function
CREATE OR REPLACE FUNCTION public.check_user_exists_by_email(user_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE email = user_email
  );
END;
$function$;

-- Fix get_user_id_by_email function 
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = user_email LIMIT 1;
  RETURN user_id;
END;
$function$;

-- Fix execute_sql function
CREATE OR REPLACE FUNCTION public.execute_sql(sql text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  EXECUTE sql;
END;
$function$;