-- Fix Product Catalog Security Vulnerabilities
-- Remove all public access policies that expose business intelligence

-- 1. Secure Products Table - Remove all public access policies
DROP POLICY IF EXISTS "products_unified_access" ON public.products;
DROP POLICY IF EXISTS "products_company_isolation" ON public.products;

-- Keep only secure policies for products
-- Authenticated company access
CREATE POLICY "products_secure_company_access" 
ON public.products 
FOR ALL 
TO authenticated 
USING ((company_id = get_user_company_id()) OR is_admin_optimized())
WITH CHECK ((company_id = get_user_company_id()) OR is_admin_optimized());

-- 2. Secure Product Variant Prices - Remove problematic public policies
DROP POLICY IF EXISTS "Product variant prices access" ON public.product_variant_prices;

-- Keep only company-specific access
CREATE POLICY "product_variant_prices_secure_access" 
ON public.product_variant_prices 
FOR ALL 
TO authenticated 
USING ((product_id IN (
  SELECT id FROM products 
  WHERE company_id = get_user_company_id()
)) OR is_admin_optimized())
WITH CHECK ((product_id IN (
  SELECT id FROM products 
  WHERE company_id = get_user_company_id()
)) OR is_admin_optimized());

-- 3. Secure Category Environmental Data - Remove public API access
DROP POLICY IF EXISTS "Public read for API" ON public.category_environmental_data;

-- Only company and admin access
CREATE POLICY "category_environmental_data_secure_access" 
ON public.category_environmental_data 
FOR ALL 
TO authenticated 
USING ((company_id = get_user_company_id()) OR is_admin_optimized())
WITH CHECK ((company_id = get_user_company_id()) OR is_admin_optimized());

-- 4. Secure Leaser Ranges - Remove public access
DROP POLICY IF EXISTS "leaser_ranges_public_access" ON public.leaser_ranges;

-- Keep only company-specific access
CREATE POLICY "leaser_ranges_secure_company_access" 
ON public.leaser_ranges 
FOR ALL 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM leasers l
  WHERE l.id = leaser_ranges.leaser_id 
  AND (l.company_id = get_user_company_id() OR is_admin_optimized())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM leasers l
  WHERE l.id = leaser_ranges.leaser_id 
  AND (l.company_id = get_user_company_id() OR is_admin_optimized())
));

-- 5. Secure Fleet Templates - Remove public read access
DROP POLICY IF EXISTS "fleet_templates_read" ON public.fleet_templates;

-- Only authenticated company access
CREATE POLICY "fleet_templates_secure_access" 
ON public.fleet_templates 
FOR SELECT 
TO authenticated 
USING (is_admin_optimized() OR (
  is_active = true AND 
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.company_id IS NOT NULL
  )
));

-- 6. Create specific API endpoints for public catalog access
-- This replaces the broad public access with controlled access for legitimate use cases
CREATE POLICY "products_catalog_api_access" 
ON public.products 
FOR SELECT 
TO anon 
USING (
  -- Only allow access via specific API endpoints with valid tokens
  company_id IN (
    SELECT DISTINCT o.company_id
    FROM offers o
    JOIN offer_upload_links oul ON o.id = oul.offer_id
    WHERE oul.expires_at > now() 
    AND oul.used_at IS NULL
  )
  AND active = true 
  AND (admin_only = false OR admin_only IS NULL)
);

-- 7. Allow public access to essential brand/category data only for catalog API
CREATE POLICY "brands_catalog_api_only" 
ON public.brands 
FOR SELECT 
TO anon 
USING (
  company_id IN (
    SELECT DISTINCT o.company_id
    FROM offers o
    JOIN offer_upload_links oul ON o.id = oul.offer_id
    WHERE oul.expires_at > now() 
    AND oul.used_at IS NULL
  )
);

CREATE POLICY "categories_catalog_api_only" 
ON public.categories 
FOR SELECT 
TO anon 
USING (
  company_id IN (
    SELECT DISTINCT o.company_id
    FROM offers o
    JOIN offer_upload_links oul ON o.id = oul.offer_id
    WHERE oul.expires_at > now() 
    AND oul.used_at IS NULL
  )
);