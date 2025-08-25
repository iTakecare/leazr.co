-- FINAL SECURITY CLEANUP: Remove all remaining public access to sensitive business data

-- Clean up all public access policies on modules (there are many conflicting ones)
DROP POLICY IF EXISTS "Modules are publicly readable" ON public.modules;
DROP POLICY IF EXISTS "Public read modules" ON public.modules;
DROP POLICY IF EXISTS "modules_read_all" ON public.modules;
DROP POLICY IF EXISTS "Admin manage modules" ON public.modules;
DROP POLICY IF EXISTS "modules_admin_delete" ON public.modules;
DROP POLICY IF EXISTS "modules_admin_update" ON public.modules;

-- Keep only secure admin access to modules
-- (modules_admin_manage and modules_admin_only policies will handle this)

-- Clean up all public access policies on platform_settings
DROP POLICY IF EXISTS "platform_settings_public_branding" ON public.platform_settings;
DROP POLICY IF EXISTS "platform_settings_authenticated_read" ON public.platform_settings;

-- Clean up public access policies on product_variant_prices  
DROP POLICY IF EXISTS "product_variant_prices_public_catalog_access" ON public.product_variant_prices;

-- Clean up public access policies on products
DROP POLICY IF EXISTS "products_catalog_api_access" ON public.products;
DROP POLICY IF EXISTS "products_public_catalog_access" ON public.products;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;

-- Run security scan to verify all public access is removed