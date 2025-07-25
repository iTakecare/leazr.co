-- Check which functions still have mutable search_path warnings
-- First let's identify functions that might still need fixing

-- Add search_path to remaining security functions that might be missing it
-- Looking at common functions that might be missing search_path

-- Fix can_manage_users function if it exists
CREATE OR REPLACE FUNCTION public.can_manage_users()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
END;
$function$;

-- Fix is_admin function if it exists (create a standardized version)
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
END;
$function$;

-- Fix is_admin_optimized function if it exists (create a standardized version)
CREATE OR REPLACE FUNCTION public.is_admin_optimized()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
END;
$function$;