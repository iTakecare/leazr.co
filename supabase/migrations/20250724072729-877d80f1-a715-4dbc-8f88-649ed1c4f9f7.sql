-- Nettoyage complet des politiques RLS dupliquées accédant à auth.users
-- Ceci va résoudre l'erreur "permission denied for table users" définitivement

-- 1. PRIORITÉ: Nettoyer woocommerce_configs (cause directe du problème)
DROP POLICY IF EXISTS "Admin only woocommerce_configs" ON public.woocommerce_configs;
DROP POLICY IF EXISTS "woocommerce_configs_admin_access" ON public.woocommerce_configs;
DROP POLICY IF EXISTS "woocommerce_configs_user_access" ON public.woocommerce_configs;
-- Garder uniquement: "woocommerce_configs_unified_access"

-- 2. Nettoyer blog_posts
DROP POLICY IF EXISTS "Admin manage blog_posts" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_admin" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_admin_write" ON public.blog_posts;
-- Garder: "Blog posts unified" et "blog_posts_public_read"

-- 3. Nettoyer content_cms
DROP POLICY IF EXISTS "Admin manage content_cms" ON public.content_cms;
DROP POLICY IF EXISTS "content_cms_admin" ON public.content_cms;
DROP POLICY IF EXISTS "content_cms_admin_write" ON public.content_cms;
-- Garder: "Content CMS unified" et "content_cms_public_read"

-- 4. Nettoyer companies
DROP POLICY IF EXISTS "companies_admin_access" ON public.companies;

-- 5. Nettoyer contracts
DROP POLICY IF EXISTS "contracts_company_access" ON public.contracts;

-- 6. Nettoyer admin_pending_requests
DROP POLICY IF EXISTS "admin_pending_requests_admin_only" ON public.admin_pending_requests;
-- Garder: "admin_pending_requests_access"

-- 7. Nettoyer ambassador_clients
DROP POLICY IF EXISTS "ambassador_clients_access" ON public.ambassador_clients;
-- Garder: "ambassador_clients_company_access"

-- 8. Nettoyer contract_workflow_logs 
DROP POLICY IF EXISTS "contract_workflow_logs_access" ON public.contract_workflow_logs;
-- Garder: "contract_workflow_logs_company_access"

-- 9. Nettoyer les autres tables avec des politiques problématiques
DROP POLICY IF EXISTS "hero_cms_admin" ON public.hero_cms;
DROP POLICY IF EXISTS "hero_cms_admin_write" ON public.hero_cms;
DROP POLICY IF EXISTS "menus_cms_admin" ON public.menus_cms;
DROP POLICY IF EXISTS "menus_cms_admin_write" ON public.menus_cms;
DROP POLICY IF EXISTS "meta_cms_admin" ON public.meta_cms;
DROP POLICY IF EXISTS "meta_cms_admin_write" ON public.meta_cms;
DROP POLICY IF EXISTS "steps_cms_admin" ON public.steps_cms;
DROP POLICY IF EXISTS "steps_cms_admin_write" ON public.steps_cms;
DROP POLICY IF EXISTS "pages_cms_admin" ON public.pages_cms;
DROP POLICY IF EXISTS "pages_cms_admin_write" ON public.pages_cms;

-- 10. Nettoyer modules et permissions
DROP POLICY IF EXISTS "modules_admin" ON public.modules;
DROP POLICY IF EXISTS "modules_admin_write" ON public.modules;
DROP POLICY IF EXISTS "permissions_admin" ON public.permissions;
DROP POLICY IF EXISTS "permissions_admin_write" ON public.permissions;
DROP POLICY IF EXISTS "permission_profiles_admin" ON public.permission_profiles;
DROP POLICY IF EXISTS "permission_profiles_admin_write" ON public.permission_profiles;

-- 11. Nettoyer product_attributes et product_attribute_values
DROP POLICY IF EXISTS "product_attributes_admin" ON public.product_attributes;
DROP POLICY IF EXISTS "product_attributes_admin_write" ON public.product_attributes;
DROP POLICY IF EXISTS "product_attribute_values_admin" ON public.product_attribute_values;
DROP POLICY IF EXISTS "product_attribute_values_admin_write" ON public.product_attribute_values;

-- 12. Nettoyer pdf_templates
DROP POLICY IF EXISTS "pdf_templates_admin_manage" ON public.pdf_templates;

-- 13. Nettoyer toutes les autres politiques similaires
DROP POLICY IF EXISTS "site_settings_admin" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_admin_write" ON public.site_settings;
DROP POLICY IF EXISTS "smtp_settings_admin" ON public.smtp_settings;
DROP POLICY IF EXISTS "smtp_settings_admin_write" ON public.smtp_settings;
DROP POLICY IF EXISTS "email_templates_admin" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_admin_write" ON public.email_templates;

-- Message de confirmation
-- TOUTES les politiques accédant directement à auth.users ont été supprimées
-- Seules les politiques utilisant is_admin_optimized() et get_user_company_id() restent actives
-- Ceci devrait résoudre définitivement l'erreur "permission denied for table users"