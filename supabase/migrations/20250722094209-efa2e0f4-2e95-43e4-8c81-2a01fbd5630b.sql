-- Add missing columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS short_description TEXT,
ADD COLUMN IF NOT EXISTS is_refurbished BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS condition TEXT,
ADD COLUMN IF NOT EXISTS purchase_price NUMERIC DEFAULT 0;

-- Check if brand and category columns are text or UUID
-- If they are text, we'll rename them to prepare for proper foreign key relations
DO $$
BEGIN
  -- Check if brand column exists and is text
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'products' 
             AND column_name = 'brand' 
             AND data_type = 'text') THEN
    -- Rename brand to brand_name for backward compatibility
    ALTER TABLE public.products RENAME COLUMN brand TO brand_name;
    -- Add brand_id column for future foreign key
    ALTER TABLE public.products ADD COLUMN brand_id UUID;
  END IF;
  
  -- Check if category column exists and is text  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'products' 
             AND column_name = 'category' 
             AND data_type = 'text') THEN
    -- Rename category to category_name for backward compatibility
    ALTER TABLE public.products RENAME COLUMN category TO category_name;
    -- Add category_id column for future foreign key
    ALTER TABLE public.products ADD COLUMN category_id UUID;
  END IF;
END $$;

-- Add foreign key constraints if brands and categories tables exist
DO $$
BEGIN
  -- Add foreign key to brands table if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brands') THEN
    ALTER TABLE public.products 
    ADD CONSTRAINT fk_products_brand_id 
    FOREIGN KEY (brand_id) REFERENCES public.brands(id);
  END IF;
  
  -- Add foreign key to categories table if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categories') THEN
    ALTER TABLE public.products 
    ADD CONSTRAINT fk_products_category_id 
    FOREIGN KEY (category_id) REFERENCES public.categories(id);
  END IF;
END $$;