-- Insert comprehensive European data

-- First, populate the countries table with all European countries
INSERT INTO public.countries (code, name_en, name_fr, flag, dial_code, is_priority) VALUES
-- Priority countries
('BE', 'Belgium', 'Belgique', '🇧🇪', '+32', true),
('FR', 'France', 'France', '🇫🇷', '+33', true),
('LU', 'Luxembourg', 'Luxembourg', '🇱🇺', '+352', true),
-- Other European countries
('AD', 'Andorra', 'Andorre', '🇦🇩', '+376', false),
('AL', 'Albania', 'Albanie', '🇦🇱', '+355', false),
('AT', 'Austria', 'Autriche', '🇦🇹', '+43', false),
('BA', 'Bosnia and Herzegovina', 'Bosnie-Herzégovine', '🇧🇦', '+387', false),
('BG', 'Bulgaria', 'Bulgarie', '🇧🇬', '+359', false),
('BY', 'Belarus', 'Biélorussie', '🇧🇾', '+375', false),
('CH', 'Switzerland', 'Suisse', '🇨🇭', '+41', false),
('CY', 'Cyprus', 'Chypre', '🇨🇾', '+357', false),
('CZ', 'Czech Republic', 'République tchèque', '🇨🇿', '+420', false),
('DE', 'Germany', 'Allemagne', '🇩🇪', '+49', false),
('DK', 'Denmark', 'Danemark', '🇩🇰', '+45', false),
('EE', 'Estonia', 'Estonie', '🇪🇪', '+372', false),
('ES', 'Spain', 'Espagne', '🇪🇸', '+34', false),
('FI', 'Finland', 'Finlande', '🇫🇮', '+358', false),
('FO', 'Faroe Islands', 'Îles Féroé', '🇫🇴', '+298', false),
('GB', 'United Kingdom', 'Royaume-Uni', '🇬🇧', '+44', false),
('GE', 'Georgia', 'Géorgie', '🇬🇪', '+995', false),
('GI', 'Gibraltar', 'Gibraltar', '🇬🇮', '+350', false),
('GR', 'Greece', 'Grèce', '🇬🇷', '+30', false),
('HR', 'Croatia', 'Croatie', '🇭🇷', '+385', false),
('HU', 'Hungary', 'Hongrie', '🇭🇺', '+36', false),
('IE', 'Ireland', 'Irlande', '🇮🇪', '+353', false),
('IS', 'Iceland', 'Islande', '🇮🇸', '+354', false),
('IT', 'Italy', 'Italie', '🇮🇹', '+39', false),
('LI', 'Liechtenstein', 'Liechtenstein', '🇱🇮', '+423', false),
('LT', 'Lithuania', 'Lituanie', '🇱🇹', '+370', false),
('LV', 'Latvia', 'Lettonie', '🇱🇻', '+371', false),
('MC', 'Monaco', 'Monaco', '🇲🇨', '+377', false),
('MD', 'Moldova', 'Moldavie', '🇲🇩', '+373', false),
('ME', 'Montenegro', 'Monténégro', '🇲🇪', '+382', false),
('MK', 'North Macedonia', 'Macédoine du Nord', '🇲🇰', '+389', false),
('MT', 'Malta', 'Malte', '🇲🇹', '+356', false),
('NL', 'Netherlands', 'Pays-Bas', '🇳🇱', '+31', false),
('NO', 'Norway', 'Norvège', '🇳🇴', '+47', false),
('PL', 'Poland', 'Pologne', '🇵🇱', '+48', false),
('PT', 'Portugal', 'Portugal', '🇵🇹', '+351', false),
('RO', 'Romania', 'Roumanie', '🇷🇴', '+40', false),
('RS', 'Serbia', 'Serbie', '🇷🇸', '+381', false),
('RU', 'Russia', 'Russie', '🇷🇺', '+7', false),
('SE', 'Sweden', 'Suède', '🇸🇪', '+46', false),
('SI', 'Slovenia', 'Slovénie', '🇸🇮', '+386', false),
('SK', 'Slovakia', 'Slovaquie', '🇸🇰', '+421', false),
('SM', 'San Marino', 'Saint-Marin', '🇸🇲', '+378', false),
('UA', 'Ukraine', 'Ukraine', '🇺🇦', '+380', false),
('VA', 'Vatican City', 'Vatican', '🇻🇦', '+379', false),
('XK', 'Kosovo', 'Kosovo', '🇽🇰', '+383', false)
ON CONFLICT (code) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_fr = EXCLUDED.name_fr,
  flag = EXCLUDED.flag,
  dial_code = EXCLUDED.dial_code,
  is_priority = EXCLUDED.is_priority;

-- Create function to bulk insert postal codes
CREATE OR REPLACE FUNCTION insert_postal_codes_bulk(
  p_country_code text,
  p_postal_codes jsonb
) RETURNS void AS $$
DECLARE
  postal_record jsonb;
BEGIN
  FOR postal_record IN SELECT * FROM jsonb_array_elements(p_postal_codes)
  LOOP
    INSERT INTO public.postal_codes (
      country_code,
      postal_code,
      city_name,
      region,
      latitude,
      longitude
    ) VALUES (
      p_country_code,
      postal_record->>'code',
      postal_record->>'city',
      postal_record->>'region',
      (postal_record->>'lat')::numeric,
      (postal_record->>'lng')::numeric
    ) ON CONFLICT (country_code, postal_code, city_name) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_postal_codes_country_postal ON public.postal_codes(country_code, postal_code);
CREATE INDEX IF NOT EXISTS idx_postal_codes_city_search ON public.postal_codes(country_code, city_name);
CREATE INDEX IF NOT EXISTS idx_countries_priority ON public.countries(is_priority DESC, name_en);

-- Create functions for postal code services
CREATE OR REPLACE FUNCTION get_cities_by_postal_code(
  p_country_code text,
  p_postal_code text
) RETURNS TABLE(city_name text, region text) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT 
    pc.city_name,
    pc.region
  FROM public.postal_codes pc
  WHERE pc.country_code = p_country_code 
    AND pc.postal_code = p_postal_code
  ORDER BY pc.city_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION search_postal_codes(
  p_country_code text,
  p_search_term text,
  p_limit integer DEFAULT 20
) RETURNS TABLE(
  postal_code text,
  city_name text,
  region text,
  latitude numeric,
  longitude numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.postal_code,
    pc.city_name,
    pc.region,
    pc.latitude,
    pc.longitude
  FROM public.postal_codes pc
  WHERE pc.country_code = p_country_code 
    AND (
      pc.postal_code ILIKE p_search_term || '%' 
      OR pc.city_name ILIKE '%' || p_search_term || '%'
    )
  ORDER BY 
    CASE 
      WHEN pc.postal_code ILIKE p_search_term || '%' THEN 1
      ELSE 2
    END,
    pc.postal_code,
    pc.city_name
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_default_country_for_company(
  p_company_id uuid
) RETURNS text AS $$
DECLARE
  company_country text;
BEGIN
  -- Try to get country from company settings or use Belgium as default
  SELECT 
    CASE 
      WHEN c.name ILIKE '%france%' OR c.name ILIKE '%français%' THEN 'FR'
      WHEN c.name ILIKE '%luxembourg%' THEN 'LU'
      ELSE 'BE'
    END INTO company_country
  FROM public.companies c
  WHERE c.id = p_company_id;
  
  RETURN COALESCE(company_country, 'BE');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;