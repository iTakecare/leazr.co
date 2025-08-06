-- Fix the last remaining functions with non-standard search_path
-- Standardize all to 'SET search_path TO public' for maximum security

CREATE OR REPLACE FUNCTION public.create_company_user(p_email text, p_password text, p_first_name text, p_last_name text, p_role text, p_company_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.create_company_with_admin(company_name text, admin_email text, admin_password text, admin_first_name text, admin_last_name text, plan_type text DEFAULT 'starter'::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.get_all_users_extended()
RETURNS TABLE(id uuid, email text, email_confirmed_at timestamp with time zone, last_sign_in_at timestamp with time zone, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY 
  SELECT 
    au.id,
    au.email,
    au.email_confirmed_at,
    au.last_sign_in_at,
    au.created_at
  FROM 
    auth.users au;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT id FROM auth.users WHERE email = user_email LIMIT 1
  );
END;
$function$;