-- Let's fix all remaining security definer functions by adding search_path
-- We'll update the major ones that are likely causing the warnings

-- Fix update_client_securely function
CREATE OR REPLACE FUNCTION public.update_client_securely(p_client_id uuid, p_updates jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.clients
  SET 
    name = COALESCE(p_updates->>'name', name),
    email = COALESCE(p_updates->>'email', email),
    company = COALESCE(p_updates->>'company', company),
    phone = COALESCE(p_updates->>'phone', phone),
    address = COALESCE(p_updates->>'address', address),
    city = COALESCE(p_updates->>'city', city),
    postal_code = COALESCE(p_updates->>'postal_code', postal_code),
    country = COALESCE(p_updates->>'country', country),
    vat_number = COALESCE(p_updates->>'vat_number', vat_number),
    notes = COALESCE(p_updates->>'notes', notes),
    status = COALESCE(p_updates->>'status', status),
    updated_at = NOW()
  WHERE id = p_client_id;
  
  RETURN FOUND;
END;
$function$;

-- Fix check_user_exists_by_id function
CREATE OR REPLACE FUNCTION public.check_user_exists_by_id(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE id = user_id
  );
END;
$function$;

-- Fix find_duplicate_client_emails function
CREATE OR REPLACE FUNCTION public.find_duplicate_client_emails()
 RETURNS SETOF text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT email
  FROM public.clients
  WHERE email IS NOT NULL AND email != ''
  GROUP BY email
  HAVING COUNT(*) > 1;
$function$;