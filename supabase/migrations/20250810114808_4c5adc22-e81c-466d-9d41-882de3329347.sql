-- Create API keys table for catalog API access
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '{"products": true, "categories": true, "brands": true, "packs": true, "environmental": true, "images": true, "attributes": true, "specifications": true}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies for API keys
CREATE POLICY "API keys company isolation"
ON public.api_keys
FOR ALL
USING (company_id = get_user_company_id() OR is_admin_optimized())
WITH CHECK (company_id = get_user_company_id() OR is_admin_optimized());

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_api_keys_updated_at();

-- Create index for performance
CREATE INDEX idx_api_keys_company_id ON public.api_keys(company_id);
CREATE INDEX idx_api_keys_api_key ON public.api_keys(api_key) WHERE is_active = true;