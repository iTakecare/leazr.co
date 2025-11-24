-- Corriger la fonction get_admin_emails_for_company avec des casts explicites vers TEXT
-- Cela résout l'erreur: "Returned type character varying(255) does not match expected type text"

DROP FUNCTION IF EXISTS public.get_admin_emails_for_company(UUID);

CREATE OR REPLACE FUNCTION public.get_admin_emails_for_company(p_company_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    au.email::TEXT,
    TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))::TEXT as name
  FROM profiles p
  INNER JOIN auth.users au ON au.id = p.id
  WHERE p.company_id = p_company_id
    AND p.role = 'admin'
    AND au.email IS NOT NULL;
END;
$$;