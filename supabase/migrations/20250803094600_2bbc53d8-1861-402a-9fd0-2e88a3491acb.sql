-- Optimize postal codes table with proper indexes
CREATE INDEX IF NOT EXISTS idx_postal_codes_country_code ON public.postal_codes(country_code);
CREATE INDEX IF NOT EXISTS idx_postal_codes_postal_code ON public.postal_codes(postal_code);
CREATE INDEX IF NOT EXISTS idx_postal_codes_city_name ON public.postal_codes(city_name);
CREATE INDEX IF NOT EXISTS idx_postal_codes_search ON public.postal_codes(country_code, postal_code, city_name);

-- Create a more efficient postal code search function
CREATE OR REPLACE FUNCTION public.search_postal_codes(
  search_query text,
  country_filter text DEFAULT NULL,
  result_limit integer DEFAULT 20
)
RETURNS TABLE(
  postal_code text,
  city text,
  region text,
  country_code text,
  country_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.postal_code,
    pc.city_name as city,
    pc.region,
    pc.country_code,
    c.name_fr as country_name
  FROM public.postal_codes pc
  LEFT JOIN public.countries c ON pc.country_code = c.code
  WHERE (country_filter IS NULL OR pc.country_code = country_filter)
    AND (
      pc.postal_code ILIKE search_query || '%' 
      OR pc.city_name ILIKE '%' || search_query || '%'
    )
  ORDER BY 
    CASE 
      WHEN pc.postal_code ILIKE search_query || '%' THEN 1
      ELSE 2
    END,
    pc.postal_code,
    pc.city_name
  LIMIT result_limit;
END;
$$;

-- Update the cities by postal code function
CREATE OR REPLACE FUNCTION public.get_cities_by_postal_code(
  p_postal_code text,
  p_country_code text DEFAULT NULL
)
RETURNS TABLE(
  postal_code text,
  city text,
  region text,
  country_code text,
  country_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.postal_code,
    pc.city_name as city,
    pc.region,
    pc.country_code,
    c.name_fr as country_name
  FROM public.postal_codes pc
  LEFT JOIN public.countries c ON pc.country_code = c.code
  WHERE pc.postal_code = p_postal_code
    AND (p_country_code IS NULL OR pc.country_code = p_country_code)
  ORDER BY pc.city_name;
END;
$$;

-- Add a function to get postal code import statistics
CREATE OR REPLACE FUNCTION public.get_postal_code_stats()
RETURNS TABLE(
  country_code text,
  country_name text,
  postal_code_count bigint,
  last_updated timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.country_code,
    c.name_fr as country_name,
    COUNT(*) as postal_code_count,
    MAX(pc.updated_at) as last_updated
  FROM public.postal_codes pc
  LEFT JOIN public.countries c ON pc.country_code = c.code
  GROUP BY pc.country_code, c.name_fr
  ORDER BY pc.country_code;
END;
$$;