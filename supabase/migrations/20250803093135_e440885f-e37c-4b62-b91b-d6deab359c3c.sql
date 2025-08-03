-- Fix security warnings: Add RLS and proper search paths

-- Fix function search paths
CREATE OR REPLACE FUNCTION update_countries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION update_postal_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Enable RLS on both tables
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postal_codes ENABLE ROW LEVEL SECURITY;

-- Countries are publicly readable
CREATE POLICY "countries_public_read" ON public.countries
  FOR SELECT TO public
  USING (true);

-- Postal codes are publicly readable  
CREATE POLICY "postal_codes_public_read" ON public.postal_codes
  FOR SELECT TO public
  USING (true);

-- Only admins can modify countries and postal codes
CREATE POLICY "countries_admin_write" ON public.countries
  FOR ALL TO authenticated
  USING (is_admin_optimized())
  WITH CHECK (is_admin_optimized());

CREATE POLICY "postal_codes_admin_write" ON public.postal_codes
  FOR ALL TO authenticated
  USING (is_admin_optimized())
  WITH CHECK (is_admin_optimized());