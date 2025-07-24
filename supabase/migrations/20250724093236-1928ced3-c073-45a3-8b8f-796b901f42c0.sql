-- Fix the get_public_products_by_company function to use correct column names that exist
CREATE OR REPLACE FUNCTION public.get_public_products_by_company(p_company_id uuid)
 RETURNS TABLE(id uuid, name text, description text, price numeric, stock_quantity integer, category text, brand text, brand_translation text, category_translation text, image_url text, sku text, weight numeric, dimensions text, warranty_period text, in_stock boolean, company_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
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
    p.stock,
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
    p.updated_at
  FROM public.products p
  LEFT JOIN public.brands b ON p.brand_id = b.id AND b.company_id = p_company_id
  LEFT JOIN public.categories c ON p.category_id = c.id AND c.company_id = p_company_id
  WHERE p.company_id = p_company_id
  ORDER BY p.created_at DESC;
END;
$function$;