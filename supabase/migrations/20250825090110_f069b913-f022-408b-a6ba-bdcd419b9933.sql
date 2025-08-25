-- Remove ALL remaining public access policies from sensitive business tables
-- These policies are creating security vulnerabilities by exposing business data

-- Remove all public access to platform_settings (contains sensitive business info)
DROP POLICY IF EXISTS "platform_settings_public_branding_minimal" ON public.platform_settings;
DROP POLICY IF EXISTS "platform_settings_public_branding_only" ON public.platform_settings;

-- Only allow admin access to platform_settings
CREATE POLICY "platform_settings_admin_only" 
ON public.platform_settings
FOR ALL
USING (is_admin_optimized())
WITH CHECK (is_admin_optimized());

-- Remove conflicting policies on products that might still allow public access
DROP POLICY IF EXISTS "products_authenticated_access" ON public.products;

-- Products should only be accessible within company boundaries
-- (keeping the existing company_isolation policy)

-- Remove conflicting policies on product_variant_prices
DROP POLICY IF EXISTS "product_variant_prices_authenticated_only" ON public.product_variant_prices;

-- Pricing should only be accessible within company boundaries
-- (keeping the existing company_isolation policy)

-- Remove conflicting policies on modules
DROP POLICY IF EXISTS "modules_authenticated_access" ON public.modules;

-- Modules should be admin-only
CREATE POLICY "modules_admin_only" 
ON public.modules
FOR ALL
USING (is_admin_optimized())
WITH CHECK (is_admin_optimized());

-- Secure countries table (business intelligence data)
DROP POLICY IF EXISTS "countries_public_read" ON public.countries;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.countries;

CREATE POLICY "countries_authenticated_access" 
ON public.countries
FOR SELECT
USING (auth.uid() IS NOT NULL);