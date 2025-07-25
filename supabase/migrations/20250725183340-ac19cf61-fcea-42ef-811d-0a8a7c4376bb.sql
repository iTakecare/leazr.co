-- Comprehensive fix for all remaining security definer functions without search_path
-- Let's recreate ALL security definer functions to ensure they have proper search_path

-- Company and user management functions
CREATE OR REPLACE FUNCTION public.create_company_with_admin(company_name text, admin_email text, admin_password text, admin_first_name text, admin_last_name text, plan_type text DEFAULT 'starter'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  new_company_id UUID;
  new_user_id UUID;
BEGIN
  INSERT INTO public.companies (name, plan)
  VALUES (company_name, plan_type)
  RETURNING id INTO new_company_id;
  
  INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES (
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    now(),
    jsonb_build_object('first_name', admin_first_name, 'last_name', admin_last_name, 'role', 'admin')
  )
  RETURNING id INTO new_user_id;
  
  INSERT INTO public.profiles (id, first_name, last_name, role, company_id)
  VALUES (new_user_id, admin_first_name, admin_last_name, 'admin', new_company_id);
  
  RETURN new_company_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_company_user(p_email text, p_password text, p_first_name text, p_last_name text, p_role text, p_company_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  new_user_id UUID;
  user_metadata JSONB;
BEGIN
  -- Create metadata object
  user_metadata := jsonb_build_object(
    'first_name', p_first_name,
    'last_name', p_last_name,
    'role', p_role
  );
  
  -- Create the user in auth.users
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    user_metadata,
    now(),
    now()
  )
  RETURNING id INTO new_user_id;
  
  -- Create the profile
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    role,
    company_id
  )
  VALUES (
    new_user_id,
    p_first_name,
    p_last_name,
    p_role,
    p_company_id
  );
  
  RETURN new_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_company_user(p_user_id uuid, p_first_name text, p_last_name text, p_role text, p_company_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles
  SET 
    first_name = p_first_name,
    last_name = p_last_name,
    role = p_role,
    company_id = COALESCE(p_company_id, company_id),
    updated_at = now()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$function$;