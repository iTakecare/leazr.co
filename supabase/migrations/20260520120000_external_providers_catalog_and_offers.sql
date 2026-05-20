-- ============================================
-- EXTERNAL PROVIDERS: Catalog visibility flag
-- ============================================
-- Controls whether a provider appears as an upsell on catalog product pages.
-- Independent of is_active (which controls global enabled/disabled status).
-- Defaults to true so existing providers stay visible after the migration.

ALTER TABLE public.external_providers
  ADD COLUMN IF NOT EXISTS is_visible_in_catalog BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_external_providers_visible_catalog
  ON public.external_providers(company_id, is_visible_in_catalog)
  WHERE is_visible_in_catalog = true;

-- Note: offer-side persistence reuses the existing public.offer_external_services
-- table (introduced in migration 20260314123721) which already stores provider_name,
-- product_name, price_htva, billing_period and quantity per offer. No new table needed.
