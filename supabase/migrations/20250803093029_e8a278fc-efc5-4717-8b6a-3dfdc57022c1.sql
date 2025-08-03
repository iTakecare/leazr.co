-- Create countries and postal_codes tables first
CREATE TABLE IF NOT EXISTS public.countries (
  code text PRIMARY KEY,
  name_en text NOT NULL,
  name_fr text NOT NULL,
  flag text NOT NULL,
  dial_code text NOT NULL,
  is_priority boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.postal_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code text NOT NULL REFERENCES public.countries(code) ON DELETE CASCADE,
  postal_code text NOT NULL,
  city_name text NOT NULL,
  region text,
  latitude numeric,
  longitude numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(country_code, postal_code, city_name)
);

-- Add updated_at trigger for countries
CREATE OR REPLACE FUNCTION update_countries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_countries_updated_at
  BEFORE UPDATE ON public.countries
  FOR EACH ROW
  EXECUTE FUNCTION update_countries_updated_at();

-- Add updated_at trigger for postal_codes
CREATE OR REPLACE FUNCTION update_postal_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_postal_codes_updated_at
  BEFORE UPDATE ON public.postal_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_postal_codes_updated_at();