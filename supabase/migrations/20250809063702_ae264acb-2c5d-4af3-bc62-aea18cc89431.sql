-- Remove embed-related columns from company_customizations table
ALTER TABLE company_customizations 
DROP COLUMN IF EXISTS public_catalog_embed_mode,
DROP COLUMN IF EXISTS public_catalog_enable_cart_sync,
DROP COLUMN IF EXISTS public_catalog_parent_origin;