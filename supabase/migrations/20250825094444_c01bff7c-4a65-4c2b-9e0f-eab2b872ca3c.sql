-- CRITICAL SECURITY FIXES - Remove public access from sensitive data

-- 1. Secure company_email_confirmations - Remove public read access
DROP POLICY IF EXISTS "company_email_confirmations_public_select" ON public.company_email_confirmations;

-- Only allow SaaS admins to manage email confirmations
CREATE POLICY "company_email_confirmations_secure_access" 
ON public.company_email_confirmations 
FOR ALL 
USING (is_saas_admin())
WITH CHECK (is_saas_admin());

-- 2. Secure prospects table - Remove token-based public access
DROP POLICY IF EXISTS "prospects_token_access" ON public.prospects;
DROP POLICY IF EXISTS "prospects_public_token_read" ON public.prospects;

-- Only allow SaaS admins to access prospects
CREATE POLICY "prospects_saas_admin_only" 
ON public.prospects 
FOR ALL 
USING (is_saas_admin())
WITH CHECK (is_saas_admin());

-- 3. Secure offer_upload_links - Remove public read access
DROP POLICY IF EXISTS "offer_upload_links_public_read" ON public.offer_upload_links;
DROP POLICY IF EXISTS "offer_upload_links_token_access" ON public.offer_upload_links;

-- Only allow company members to access their upload links
CREATE POLICY "offer_upload_links_company_secure" 
ON public.offer_upload_links 
FOR ALL 
USING (
  offer_id IN (
    SELECT id FROM offers 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
)
WITH CHECK (
  offer_id IN (
    SELECT id FROM offers 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
);

-- 4. Secure CMS content - Remove overly broad public access
DROP POLICY IF EXISTS "content_cms_public_read" ON public.content_cms;

-- Keep only safe public content readable
CREATE POLICY "content_cms_public_safe_read" 
ON public.content_cms 
FOR SELECT 
USING (name IN ('homepage', 'about', 'contact', 'privacy', 'terms'));

-- 5. Remove any remaining overly permissive policies
DROP POLICY IF EXISTS "blog_posts_public_read_all" ON public.blog_posts;
DROP POLICY IF EXISTS "companies_public_read" ON public.companies;

-- 6. Ensure custom_auth_tokens are properly secured
DROP POLICY IF EXISTS "custom_auth_tokens_public_read" ON public.custom_auth_tokens;

-- Only allow the token validation function to access tokens (server-side only)
CREATE POLICY "custom_auth_tokens_server_only" 
ON public.custom_auth_tokens 
FOR ALL 
USING (false)  -- No direct access allowed
WITH CHECK (false);

-- 7. Create a secure token validation function that doesn't expose tokens
CREATE OR REPLACE FUNCTION public.validate_auth_token_secure(token_value text, token_type_filter text DEFAULT NULL)
RETURNS TABLE(is_valid boolean, user_id uuid, token_type text, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  token_record RECORD;
BEGIN
  -- Find valid, unused, unexpired token
  SELECT cat.user_id, cat.token_type, cat.expires_at 
  INTO token_record
  FROM public.custom_auth_tokens cat
  WHERE cat.token = token_value
    AND cat.used_at IS NULL
    AND cat.expires_at > now()
    AND (token_type_filter IS NULL OR cat.token_type = token_type_filter)
  LIMIT 1;
  
  IF FOUND THEN
    RETURN QUERY SELECT true, token_record.user_id, token_record.token_type, token_record.expires_at;
  ELSE
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::timestamp with time zone;
  END IF;
END;
$function$;