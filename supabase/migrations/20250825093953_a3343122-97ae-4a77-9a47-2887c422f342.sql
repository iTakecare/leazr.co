-- Fix security issues by cleaning up overly permissive and duplicate policies

-- 1. Clean up duplicate public read policies for product_attributes
DROP POLICY IF EXISTS "product_attributes_read" ON public.product_attributes;
DROP POLICY IF EXISTS "product_attributes_read_all" ON public.product_attributes;
-- Keep "Public read product_attributes" as the single controlled public read policy

-- 2. Update admin policy for product_attributes to use proper function
DROP POLICY IF EXISTS "Admin manage product_attributes" ON public.product_attributes;
CREATE POLICY "Admin manage product_attributes" 
ON public.product_attributes 
FOR ALL 
USING (is_admin_optimized())
WITH CHECK (is_admin_optimized());

-- 3. Clean up duplicate public read policies for product_attribute_values
DROP POLICY IF EXISTS "product_attribute_values_read" ON public.product_attribute_values;
DROP POLICY IF EXISTS "product_attribute_values_read_all" ON public.product_attribute_values;
-- Keep "Public read product_attribute_values" as the single controlled public read policy

-- 4. Update admin policy for product_attribute_values to use proper function
DROP POLICY IF EXISTS "Admin manage product_attribute_values" ON public.product_attribute_values;
CREATE POLICY "Admin manage product_attribute_values" 
ON public.product_attribute_values 
FOR ALL 
USING (is_admin_optimized())
WITH CHECK (is_admin_optimized());

-- 5. Fix business_profiles access - restrict to SaaS admin only
DROP POLICY IF EXISTS "business_profiles_authenticated_read" ON public.business_profiles;

-- Keep only the existing admin write policy and ensure it uses proper function
CREATE POLICY "business_profiles_saas_admin_read" 
ON public.business_profiles 
FOR SELECT 
USING (is_saas_admin());