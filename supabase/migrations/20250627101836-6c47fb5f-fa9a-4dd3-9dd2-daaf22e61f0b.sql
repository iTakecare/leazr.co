
-- Create the company_customizations table
CREATE TABLE IF NOT EXISTS public.company_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#64748b',
  accent_color TEXT DEFAULT '#8b5cf6',
  favicon_url TEXT,
  custom_domain TEXT,
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.company_customizations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their company customizations"
  ON public.company_customizations
  FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their company customizations"
  ON public.company_customizations
  FOR ALL
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_company_customizations_updated_at()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_customizations_updated_at
  BEFORE UPDATE ON public.company_customizations
  FOR EACH ROW
  EXECUTE FUNCTION update_company_customizations_updated_at();
