-- Fix remaining functions with non-standard search_path configurations
-- Standardize all to 'SET search_path TO public' for security

CREATE OR REPLACE FUNCTION public.check_bucket_exists(bucket_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = bucket_name
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_function_exists(function_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = function_name
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = $1
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_user_exists_by_email(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE email = user_email
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_user_exists_by_id(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE id = user_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_storage_bucket(bucket_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Créer le bucket s'il n'existe pas
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = bucket_name) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES (bucket_name, bucket_name, true);
  END IF;
  
  -- Créer les politiques d'accès public
  INSERT INTO storage.policies (name, definition, bucket_id, operations)
  VALUES (
    bucket_name || '_public_select',
    'TRUE',
    bucket_name,
    '{SELECT}'
  ) ON CONFLICT (name, bucket_id) DO NOTHING;
  
  INSERT INTO storage.policies (name, definition, bucket_id, operations)
  VALUES (
    bucket_name || '_public_insert',
    'TRUE',
    bucket_name,
    '{INSERT}'
  ) ON CONFLICT (name, bucket_id) DO NOTHING;
  
  INSERT INTO storage.policies (name, definition, bucket_id, operations)
  VALUES (
    bucket_name || '_public_update',
    'TRUE',
    bucket_name,
    '{UPDATE}'
  ) ON CONFLICT (name, bucket_id) DO NOTHING;
  
  INSERT INTO storage.policies (name, definition, bucket_id, operations)
  VALUES (
    bucket_name || '_public_delete',
    'TRUE',
    bucket_name,
    '{DELETE}'
  ) ON CONFLICT (name, bucket_id) DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_storage_policy(bucket_name text, policy_name text, definition text, policy_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Convertir le type de politique en tableau d'opérations
  -- policy_type peut être 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
  INSERT INTO storage.policies (name, definition, bucket_id, operations)
  VALUES (
    policy_name,
    definition,
    bucket_name,
    ARRAY[policy_type]::text[]
  ) ON CONFLICT (name, bucket_id) DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_site_settings_bucket()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'site-settings') THEN
    RETURN true;
  END IF;
  
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('site-settings', 'Site Settings', true);
  
  INSERT INTO storage.policies (name, definition, bucket_id, operations)
  VALUES ('Public Access', 'true', 'site-settings', '{SELECT}');
  
  INSERT INTO storage.policies (name, definition, bucket_id, operations)
  VALUES ('Admin Upload', '((SELECT role FROM public.profiles WHERE id = auth.uid()) = ''admin'')', 'site-settings', '{INSERT, UPDATE, DELETE}');
  
  RETURN true;
EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$function$;