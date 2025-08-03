-- Create function to get company slug from upload token
CREATE OR REPLACE FUNCTION public.get_company_slug_by_upload_token(upload_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  company_slug_result text;
BEGIN
  -- Get company slug by joining upload_links -> offers -> companies
  SELECT c.slug INTO company_slug_result
  FROM public.offer_upload_links oul
  JOIN public.offers o ON oul.offer_id = o.id
  JOIN public.companies c ON o.company_id = c.id
  WHERE oul.token = upload_token
    AND oul.expires_at > now()
    AND oul.used_at IS NULL
  LIMIT 1;
  
  RETURN company_slug_result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL if any error occurs
    RETURN NULL;
END;
$function$