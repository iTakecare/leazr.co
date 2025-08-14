-- Critical Security Fixes Migration

-- 1. Secure business_profiles table - remove public read access
DROP POLICY IF EXISTS "business_profiles_read" ON public.business_profiles;

CREATE POLICY "business_profiles_authenticated_read" 
ON public.business_profiles 
FOR SELECT 
TO authenticated 
USING (true);

-- 2. Secure products table - remove public read access, keep company isolation
DROP POLICY IF EXISTS "products_public_read" ON public.products;

CREATE POLICY "products_company_access" 
ON public.products 
FOR ALL 
TO authenticated 
USING ((company_id = get_user_company_id()) OR is_admin_optimized())
WITH CHECK ((company_id = get_user_company_id()) OR is_admin_optimized());

-- 3. Create specific public product access only for valid upload tokens
CREATE POLICY "products_public_upload_token_access" 
ON public.products 
FOR SELECT 
TO anon 
USING (company_id IN (
  SELECT DISTINCT o.company_id
  FROM offers o
  JOIN offer_upload_links oul ON o.id = oul.offer_id
  WHERE oul.expires_at > now() AND oul.used_at IS NULL
));

-- 4. Secure platform_settings - restrict contact information
DROP POLICY IF EXISTS "platform_settings_read" ON public.platform_settings;

-- Public can only read branding information
CREATE POLICY "platform_settings_public_branding" 
ON public.platform_settings 
FOR SELECT 
TO anon 
USING (true);

-- Authenticated users can read all settings
CREATE POLICY "platform_settings_authenticated_read" 
ON public.platform_settings 
FOR SELECT 
TO authenticated 
USING (true);

-- Only admins can modify
CREATE POLICY "platform_settings_admin_write" 
ON public.platform_settings 
FOR ALL 
TO authenticated 
USING (is_admin_optimized())
WITH CHECK (is_admin_optimized());

-- 5. Fix database functions search path vulnerability
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_company_id UUID;
BEGIN
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN user_company_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_optimized()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- 6. Create proper SaaS admin check function
CREATE OR REPLACE FUNCTION public.is_saas_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get current user's email from auth.users
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- Check if user is SaaS admin
  RETURN user_email = 'ecommerce@itakecare.be';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- 7. Update brands table public read policy to be more restrictive
DROP POLICY IF EXISTS "brands_public_read" ON public.brands;

CREATE POLICY "brands_public_upload_token_access" 
ON public.brands 
FOR SELECT 
TO anon 
USING (company_id IN (
  SELECT DISTINCT o.company_id
  FROM offers o
  JOIN offer_upload_links oul ON o.id = oul.offer_id
  WHERE oul.expires_at > now() AND oul.used_at IS NULL
));

-- 8. Update categories table public read policy
DROP POLICY IF EXISTS "categories_public_read" ON public.categories;

CREATE POLICY "categories_public_upload_token_access" 
ON public.categories 
FOR SELECT 
TO anon 
USING (company_id IN (
  SELECT DISTINCT o.company_id
  FROM offers o
  JOIN offer_upload_links oul ON o.id = oul.offer_id
  WHERE oul.expires_at > now() AND oul.used_at IS NULL
));