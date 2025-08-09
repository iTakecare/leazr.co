-- Add quote_request_url column to company_customizations table
ALTER TABLE public.company_customizations 
ADD COLUMN IF NOT EXISTS quote_request_url text;

-- Update the existing RPC function to include the new quote_request_url field
CREATE OR REPLACE FUNCTION public.get_public_company_customizations(p_company_id uuid)
RETURNS TABLE(
  header_enabled boolean,
  header_title text,
  header_description text,
  header_background_type text,
  header_background_config jsonb,
  company_name text,
  logo_url text,
  primary_color text,
  secondary_color text,
  accent_color text,
  quote_request_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.header_enabled,
    cc.header_title,
    cc.header_description,
    cc.header_background_type,
    cc.header_background_config,
    cc.company_name,
    cc.logo_url,
    cc.primary_color,
    cc.secondary_color,
    cc.accent_color,
    cc.quote_request_url
  FROM public.company_customizations cc
  WHERE cc.company_id = p_company_id
  LIMIT 1;
END;
$$;