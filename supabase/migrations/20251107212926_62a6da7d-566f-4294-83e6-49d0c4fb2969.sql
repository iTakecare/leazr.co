-- Create company_values table to store company values (Evolution, Confiance, Entraide)
CREATE TABLE IF NOT EXISTS public.company_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  value_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, value_key)
);

-- Create company_metrics table to store company metrics
CREATE TABLE IF NOT EXISTS public.company_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  client_satisfaction_percent NUMERIC(5,2) DEFAULT 99.3,
  devices_count INTEGER DEFAULT 0,
  co2_saved_kg NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create company_partner_logos table to store partner/client logos
CREATE TABLE IF NOT EXISTS public.company_partner_logos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  logo_name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_partner_logos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_values
CREATE POLICY "company_values_company_access"
  ON public.company_values
  FOR ALL
  USING (company_id = get_user_company_id() OR is_admin_optimized())
  WITH CHECK (company_id = get_user_company_id() OR is_admin_optimized());

-- RLS Policies for company_metrics
CREATE POLICY "company_metrics_company_access"
  ON public.company_metrics
  FOR ALL
  USING (company_id = get_user_company_id() OR is_admin_optimized())
  WITH CHECK (company_id = get_user_company_id() OR is_admin_optimized());

-- RLS Policies for company_partner_logos
CREATE POLICY "company_partner_logos_company_access"
  ON public.company_partner_logos
  FOR ALL
  USING (company_id = get_user_company_id() OR is_admin_optimized())
  WITH CHECK (company_id = get_user_company_id() OR is_admin_optimized());

-- Triggers for updated_at
CREATE TRIGGER update_company_values_updated_at
  BEFORE UPDATE ON public.company_values
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_metrics_updated_at
  BEFORE UPDATE ON public.company_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_partner_logos_updated_at
  BEFORE UPDATE ON public.company_partner_logos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_company_values_company_id ON public.company_values(company_id);
CREATE INDEX idx_company_values_order ON public.company_values(company_id, display_order);
CREATE INDEX idx_company_metrics_company_id ON public.company_metrics(company_id);
CREATE INDEX idx_company_partner_logos_company_id ON public.company_partner_logos(company_id);
CREATE INDEX idx_company_partner_logos_order ON public.company_partner_logos(company_id, display_order);

-- Insert default values for iTakecare (find company by name)
DO $$
DECLARE
  itakecare_company_id UUID;
BEGIN
  -- Find iTakecare company
  SELECT id INTO itakecare_company_id
  FROM public.companies
  WHERE name ILIKE '%itakecare%'
  LIMIT 1;

  IF itakecare_company_id IS NOT NULL THEN
    -- Insert default values
    INSERT INTO public.company_values (company_id, value_key, title, description, display_order)
    VALUES 
      (itakecare_company_id, 'evolution', 'Evolution.', 'Nous croyons en l''évolution continue, tant pour nos clients que pour notre équipe. Chaque jour est une opportunité d''apprendre et de grandir ensemble.', 1),
      (itakecare_company_id, 'confiance', 'Confiance.', 'La confiance est au cœur de nos relations. Nous construisons des partenariats durables basés sur la transparence et l''intégrité.', 2),
      (itakecare_company_id, 'entraide', 'Entraide.', 'L''entraide fait partie de notre ADN. Nous sommes là pour nos clients, nos partenaires et notre équipe, parce qu''ensemble nous sommes plus forts.', 3)
    ON CONFLICT (company_id, value_key) DO NOTHING;

    -- Insert default metrics
    INSERT INTO public.company_metrics (company_id, client_satisfaction_percent, devices_count, co2_saved_kg)
    VALUES (itakecare_company_id, 99.3, 710, 91013)
    ON CONFLICT (company_id) DO NOTHING;
  END IF;
END $$;