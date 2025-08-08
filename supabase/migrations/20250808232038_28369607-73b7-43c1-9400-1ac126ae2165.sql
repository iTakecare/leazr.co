-- Add public catalog configuration columns to company_customizations table
ALTER TABLE public.company_customizations 
ADD COLUMN public_catalog_hide_header boolean DEFAULT false,
ADD COLUMN public_catalog_enable_cart_sync boolean DEFAULT true,
ADD COLUMN public_catalog_parent_origin text,
ADD COLUMN public_catalog_embed_mode boolean DEFAULT false;