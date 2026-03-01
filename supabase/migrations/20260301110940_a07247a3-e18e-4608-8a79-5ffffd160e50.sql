
-- Add missing columns to stock_items for comprehensive stock management
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS model text;
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS warranty_end_date date;
