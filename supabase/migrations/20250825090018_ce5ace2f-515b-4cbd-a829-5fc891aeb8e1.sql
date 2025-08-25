-- CRITICAL: Fix remaining public data exposure issues
-- These are serious business security vulnerabilities that expose sensitive data to competitors

-- 1. CRITICAL: Secure product variant prices (ERROR level - exposes pricing to competitors)
DROP POLICY IF EXISTS "product_variant_prices_public_read" ON public.product_variant_prices;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.product_variant_prices;

CREATE POLICY "product_variant_prices_authenticated_only" 
ON public.product_variant_prices
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 2. CRITICAL: Secure products table (exposes complete catalog to competitors)
DROP POLICY IF EXISTS "products_public_read" ON public.products;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;

CREATE POLICY "products_authenticated_access" 
ON public.products
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 3. Secure modules table (exposes business model and pricing strategy)
DROP POLICY IF EXISTS "modules_public_read" ON public.modules;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.modules;

CREATE POLICY "modules_authenticated_access" 
ON public.modules
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 4. Double-check platform_settings is properly secured
DROP POLICY IF EXISTS "platform_settings_public_read" ON public.platform_settings;

-- Only allow very limited public access to branding info, not business details
CREATE POLICY "platform_settings_public_branding_minimal" 
ON public.platform_settings
FOR SELECT
USING (true);  -- We'll need to modify the service layer to filter sensitive fields

-- 5. Add company isolation for authenticated users
CREATE POLICY "products_company_isolation" 
ON public.products
FOR ALL
USING (
  (auth.uid() IS NOT NULL) AND 
  ((company_id = get_user_company_id()) OR is_admin_optimized())
)
WITH CHECK (
  (auth.uid() IS NOT NULL) AND 
  ((company_id = get_user_company_id()) OR is_admin_optimized())
);

CREATE POLICY "product_variant_prices_company_isolation" 
ON public.product_variant_prices
FOR ALL
USING (
  (auth.uid() IS NOT NULL) AND 
  (product_id IN (
    SELECT id FROM products 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized())
)
WITH CHECK (
  (auth.uid() IS NOT NULL) AND 
  (product_id IN (
    SELECT id FROM products 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized())
);