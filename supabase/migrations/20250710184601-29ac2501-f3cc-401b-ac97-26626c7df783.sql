-- Nettoyage des tables obsolètes et redondantes
-- Suppression dans l'ordre pour respecter les contraintes de clés étrangères

-- 1. Supprimer d'abord les tables avec des références vers d'autres tables à supprimer
DROP TABLE IF EXISTS fleet_recommendations CASCADE;
DROP TABLE IF EXISTS fleet_generation_logs CASCADE;
DROP TABLE IF EXISTS fleet_configurations CASCADE;
DROP TABLE IF EXISTS fleet_templates CASCADE;

-- 2. Supprimer les tables CMS obsolètes
DROP TABLE IF EXISTS hero_cms CASCADE;
DROP TABLE IF EXISTS menus_cms CASCADE;
DROP TABLE IF EXISTS meta_cms CASCADE;
DROP TABLE IF EXISTS content_cms CASCADE;

-- 3. Supprimer les tables PDF obsolètes
DROP TABLE IF EXISTS pdf_model_images CASCADE;
DROP TABLE IF EXISTS pdf_models CASCADE;

-- 4. Supprimer les autres tables obsolètes
DROP TABLE IF EXISTS admin_pending_requests CASCADE;
DROP TABLE IF EXISTS woocommerce_configs CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS business_profiles CASCADE;

-- 5. Nettoyer les fonctions obsolètes liées aux tables supprimées
DROP FUNCTION IF EXISTS get_company_dashboard_metrics(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS get_company_recent_activity(uuid, integer) CASCADE;