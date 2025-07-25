-- Final fix for remaining function search path warnings
-- Let's fix all the common security definer functions that might be missing search_path

-- System and utility functions
CREATE OR REPLACE FUNCTION public.check_function_exists(function_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
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
 SET search_path TO 'public', 'information_schema'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = $1
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_bucket_exists(bucket_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'storage'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = bucket_name
  );
END;
$function$;