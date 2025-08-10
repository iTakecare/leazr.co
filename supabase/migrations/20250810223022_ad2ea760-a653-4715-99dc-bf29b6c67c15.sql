-- Phase 1: Création de la table category_environmental_data
CREATE TABLE public.category_environmental_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  co2_savings_kg numeric NOT NULL DEFAULT 0,
  carbon_footprint_reduction_percentage numeric DEFAULT 0,
  energy_savings_kwh numeric DEFAULT 0,
  water_savings_liters numeric DEFAULT 0,
  waste_reduction_kg numeric DEFAULT 0,
  source_url text DEFAULT 'https://impactco2.fr',
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id, category_id)
);

-- Enable RLS
ALTER TABLE public.category_environmental_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public read for API" ON public.category_environmental_data 
FOR SELECT USING (true);

CREATE POLICY "Company admin write" ON public.category_environmental_data 
FOR ALL USING (company_id = get_user_company_id() OR is_admin_optimized());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_category_environmental_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_category_environmental_data_updated_at
  BEFORE UPDATE ON public.category_environmental_data
  FOR EACH ROW EXECUTE FUNCTION public.update_category_environmental_data_updated_at();

-- Population des données CO2 existantes d'iTakecare
INSERT INTO public.category_environmental_data (company_id, category_id, co2_savings_kg, source_url)
SELECT 
  'c1ce66bb-3ad2-474d-b477-583baa7ff1c0',
  c.id,
  CASE 
    WHEN c.name ILIKE '%laptop%' OR c.name ILIKE '%desktop%' THEN 170
    WHEN c.name ILIKE '%smartphone%' THEN 45
    WHEN c.name ILIKE '%tablet%' THEN 87
    WHEN c.name ILIKE '%monitor%' OR c.name ILIKE '%écran%' THEN 85
    WHEN c.name ILIKE '%printer%' OR c.name ILIKE '%imprimante%' THEN 65
    WHEN c.name ILIKE '%server%' OR c.name ILIKE '%serveur%' THEN 300
    WHEN c.name ILIKE '%software%' OR c.name ILIKE '%logiciel%' THEN 0
    WHEN c.name ILIKE '%accessories%' OR c.name ILIKE '%accessoires%' OR c.name ILIKE '%bureautique%' THEN 15
    ELSE 25
  END,
  'https://impactco2.fr'
FROM public.categories c 
WHERE c.company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
ON CONFLICT (company_id, category_id) DO NOTHING;