-- Supprimer l'ancienne fonction et créer la nouvelle avec support des prix de variantes
DROP FUNCTION IF EXISTS public.get_public_products_by_company(uuid);

CREATE OR REPLACE FUNCTION public.get_public_products_by_company(p_company_id uuid)
RETURNS TABLE(
  id uuid, 
  name text, 
  description text, 
  price numeric, 
  monthly_price numeric,
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
  updated_at timestamp with time zone,
  variant_combination_prices jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.monthly_price,
    p.stock as stock_quantity,
    c.name as category,
    b.name as brand,
    b.translation as brand_translation,
    c.translation as category_translation,
    p.image_url,
    p.sku,
    NULL::numeric as weight,
    NULL::text as dimensions,
    NULL::text as warranty_period,
    (p.stock > 0) as in_stock,
    p.company_id,
    p.created_at,
    p.updated_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', pvp.id,
            'attributes', pvp.attributes,
            'price', pvp.price,
            'monthly_price', pvp.monthly_price,
            'stock', pvp.stock
          )
        )
        FROM public.product_variant_prices pvp
        WHERE pvp.product_id = p.id
      ),
      '[]'::jsonb
    ) as variant_combination_prices
  FROM public.products p
  LEFT JOIN public.brands b ON p.brand_id = b.id AND b.company_id = p_company_id
  LEFT JOIN public.categories c ON p.category_id = c.id AND c.company_id = p_company_id
  WHERE p.company_id = p_company_id
    AND p.active = true
    AND COALESCE(p.admin_only, false) = false
  ORDER BY p.created_at DESC;
END;
$$;