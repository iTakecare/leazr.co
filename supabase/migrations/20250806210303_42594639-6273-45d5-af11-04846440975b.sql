-- Corriger la fonction get_template_for_offer avec la bonne casse pour le nom de l'entreprise
CREATE OR REPLACE FUNCTION public.get_template_for_offer(
  p_company_id UUID,
  p_offer_type TEXT DEFAULT 'standard',
  p_template_category TEXT DEFAULT 'offer'
)
RETURNS TABLE(
  template_id UUID,
  name TEXT,
  template_file_url TEXT,
  field_mappings JSONB,
  company_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id as template_id,
    pt.name,
    pt.template_file_url,
    pt.field_mappings,
    jsonb_build_object(
      'id', c.id,
      'name', c.name,  -- Corriger: utiliser c.name au lieu de c."companyName"
      'address', c.address,
      'city', c.city,
      'postal_code', c.postal_code,
      'country', c.country,
      'vat_number', c.vat_number,
      'phone', c.phone,
      'email', c.email
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
$$;