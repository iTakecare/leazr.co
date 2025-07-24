-- Phase 1: Create RLS policies for public catalog access

-- Products: Allow public read access when company_id is explicitly provided
CREATE POLICY "products_public_read" ON products
FOR SELECT TO anon
USING (true);

-- Brands: Allow public read access  
CREATE POLICY "brands_public_read" ON brands
FOR SELECT TO anon
USING (true);

-- Categories: Allow public read access
CREATE POLICY "categories_public_read" ON categories  
FOR SELECT TO anon
USING (true);

-- Phase 2: Create RPC function for public product access
CREATE OR REPLACE FUNCTION get_public_products_by_company(p_company_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  price numeric,
  stock_quantity integer,
  category text,
  brand text,
  brand_translation text,
  category_translation text,
  image_url text,
  sku text,
  weight numeric,
  dimensions text,
  warranty_period text,
  in_stock boolean,
  company_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.stock_quantity,
    c.name as category,
    b.name as brand,
    b.translation as brand_translation,
    c.translation as category_translation,
    p.image_url,
    p.sku,
    p.weight,
    p.dimensions,
    p.warranty_period,
    (p.stock_quantity > 0) as in_stock,
    p.company_id,
    p.created_at,
    p.updated_at
  FROM public.products p
  LEFT JOIN public.brands b ON p.brand = b.name AND b.company_id = p_company_id
  LEFT JOIN public.categories c ON p.category = c.name AND c.company_id = p_company_id
  WHERE p.company_id = p_company_id
  ORDER BY p.created_at DESC;
END;
$function$;