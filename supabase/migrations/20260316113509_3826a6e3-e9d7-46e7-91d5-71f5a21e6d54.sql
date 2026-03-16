CREATE OR REPLACE FUNCTION public.get_public_packs(p_company_id uuid)
 RETURNS TABLE(id uuid, name text, description text, image_url text, is_featured boolean, is_active boolean, pack_monthly_price numeric, pack_promo_price numeric, promo_active boolean, total_monthly_price numeric, pack_items jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    pp.id,
    pp.name,
    pp.description,
    pp.image_url,
    pp.is_featured,
    pp.is_active,
    pp.pack_monthly_price,
    pp.pack_promo_price,
    pp.promo_active,
    pp.total_monthly_price,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'quantity', ppi.quantity,
            'product', jsonb_build_object(
              'id', p.id,
              'name', p.name,
              'image_url', p.image_url,
              'category', COALESCE(c.name, p.category_name)
            )
          )
        )
        FROM public.product_pack_items ppi
        LEFT JOIN public.products p ON ppi.product_id = p.id
        LEFT JOIN public.categories c ON p.category_id = c.id
        WHERE ppi.pack_id = pp.id
      ),
      '[]'::jsonb
    ) as pack_items
  FROM public.product_packs pp
  WHERE pp.company_id = p_company_id
    AND pp.is_active = true
    AND pp.admin_only = false
    AND NOT EXISTS (
      SELECT 1 FROM public.partner_packs ppk 
      WHERE ppk.pack_id = pp.id
    )
  ORDER BY pp.is_featured DESC, pp.created_at DESC;
END;
$function$;