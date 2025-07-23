-- Add website information to brands table
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS image_search_patterns jsonb DEFAULT '{"product_paths": ["/products/", "/catalog/"], "image_selectors": ["img[src*='product']", ".product-image img", ".item-image img"]}'::jsonb;

-- Create index on website_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_brands_website_url ON public.brands(website_url) WHERE website_url IS NOT NULL;