-- Fix the get_template_for_offer function to only use existing columns
CREATE OR REPLACE FUNCTION public.get_template_for_offer(p_company_id uuid, p_offer_type text DEFAULT 'standard'::text, p_template_category text DEFAULT 'offer'::text)
 RETURNS TABLE(template_id uuid, name text, template_file_url text, field_mappings jsonb, company_data jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id as template_id,
    pt.name,
    pt.template_file_url,
    pt.field_mappings,
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'logo_url', c.logo_url,
      'primary_color', c.primary_color,
      'secondary_color', c.secondary_color,
      'accent_color', c.accent_color,
      'address', NULL,
      'city', NULL,
      'postal_code', NULL,
      'country', NULL,
      'vat_number', NULL,
      'phone', NULL,
      'email', NULL
    ) as company_data
  FROM public.pdf_templates pt
  LEFT JOIN public.companies c ON pt.company_id = c.id
  WHERE pt.company_id = p_company_id
    AND pt.template_type = p_offer_type
    AND pt.template_category = p_template_category
    AND pt.is_active = true
  ORDER BY pt.is_default DESC, pt.created_at DESC
  LIMIT 1;
END;
$function$;