-- Fix security issues by updating RLS policies

-- 1. Drop existing overly permissive policies for product_attributes
DROP POLICY IF EXISTS "product_attributes_public_read" ON public.product_attributes;
DROP POLICY IF EXISTS "product_attributes_authenticated_read" ON public.product_attributes;

-- 2. Create secure company-based policies for product_attributes
CREATE POLICY "product_attributes_company_isolation" 
ON public.product_attributes 
FOR ALL 
USING ((company_id = get_user_company_id()) OR is_admin_optimized())
WITH CHECK ((company_id = get_user_company_id()) OR is_admin_optimized());

-- 3. Add catalog API access for product_attributes (for public catalogs)
CREATE POLICY "product_attributes_catalog_api_access" 
ON public.product_attributes 
FOR SELECT 
USING (company_id IN (
  SELECT DISTINCT o.company_id
  FROM offers o
  JOIN offer_upload_links oul ON o.id = oul.offer_id
  WHERE oul.expires_at > now() AND oul.used_at IS NULL
));

-- 4. Drop existing overly permissive policies for product_attribute_values
DROP POLICY IF EXISTS "product_attribute_values_public_read" ON public.product_attribute_values;
DROP POLICY IF EXISTS "product_attribute_values_authenticated_read" ON public.product_attribute_values;

-- 5. Create secure company-based policies for product_attribute_values
CREATE POLICY "product_attribute_values_company_isolation" 
ON public.product_attribute_values 
FOR ALL 
USING ((attribute_id IN (
  SELECT id FROM product_attributes 
  WHERE company_id = get_user_company_id()
)) OR is_admin_optimized())
WITH CHECK ((attribute_id IN (
  SELECT id FROM product_attributes 
  WHERE company_id = get_user_company_id()
)) OR is_admin_optimized());

-- 6. Add catalog API access for product_attribute_values
CREATE POLICY "product_attribute_values_catalog_api_access" 
ON public.product_attribute_values 
FOR SELECT 
USING (attribute_id IN (
  SELECT pa.id FROM product_attributes pa
  WHERE pa.company_id IN (
    SELECT DISTINCT o.company_id
    FROM offers o
    JOIN offer_upload_links oul ON o.id = oul.offer_id
    WHERE oul.expires_at > now() AND oul.used_at IS NULL
  )
));

-- 7. Fix business_profiles access - restrict to SaaS admin only
DROP POLICY IF EXISTS "business_profiles_authenticated_read" ON public.business_profiles;

-- Keep only SaaS admin access for business_profiles
CREATE POLICY "business_profiles_saas_admin_only" 
ON public.business_profiles 
FOR ALL 
USING (is_saas_admin())
WITH CHECK (is_saas_admin());

-- 8. Ensure content_cms is properly secured (already has good policies but let's verify)
-- The existing policies are secure, no changes needed