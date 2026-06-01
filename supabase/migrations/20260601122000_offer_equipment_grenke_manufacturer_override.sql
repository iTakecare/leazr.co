-- Phase 3a.2c — manufacturer override per equipment line
--
-- For manually-entered equipment (i.e. not linked to a catalog product
-- via offer_equipment.product_id), we have no way to derive a Manufacturer
-- string for the Grenke FinancingObject payload. This column lets the user
-- override the manufacturer per-line directly from the payload preview modal.
--
-- Resolution order in build_offer_payload (highest to lowest priority):
--   1. offer_equipment.grenke_manufacturer_override (THIS column)
--   2. grenke_field_mappings entry for the product's brand_id
--   3. products.brand_name (denormalized cache)
--   4. brands.name / brands.translation (via brand_id join)
--   5. fallback "Other"

alter table public.offer_equipment
  add column if not exists grenke_manufacturer_override text;

comment on column public.offer_equipment.grenke_manufacturer_override is
  'Optional manufacturer name to send to Grenke for this equipment line. '
  'Takes precedence over products.brand_name / brands.name. Used for '
  'manually-entered equipment that is not linked to a catalog product.';
