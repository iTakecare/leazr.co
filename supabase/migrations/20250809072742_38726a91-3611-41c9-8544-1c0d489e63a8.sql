-- Add header configuration fields to company_customizations table
ALTER TABLE public.company_customizations 
ADD COLUMN header_enabled BOOLEAN DEFAULT true,
ADD COLUMN header_title TEXT,
ADD COLUMN header_description TEXT,
ADD COLUMN header_background_type TEXT DEFAULT 'gradient' CHECK (header_background_type IN ('solid', 'gradient', 'image')),
ADD COLUMN header_background_config JSONB DEFAULT '{}'::jsonb;

-- Remove the old hide_header field as it's replaced by header_enabled
ALTER TABLE public.company_customizations 
DROP COLUMN IF EXISTS public_catalog_hide_header;