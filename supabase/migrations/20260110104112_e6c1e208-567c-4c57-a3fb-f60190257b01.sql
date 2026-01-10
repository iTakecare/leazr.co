-- Create billing_entities table for tracking different legal entities
CREATE TABLE public.billing_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  legal_form TEXT,
  vat_number TEXT,
  partner_id TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'BE',
  valid_from DATE NOT NULL,
  valid_until DATE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add billing_entity_id to offers table
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS billing_entity_id UUID REFERENCES public.billing_entities(id);

-- Add billing_entity_id to contracts table
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS billing_entity_id UUID REFERENCES public.billing_entities(id);

-- Create index for faster lookups
CREATE INDEX idx_billing_entities_company_id ON public.billing_entities(company_id);
CREATE INDEX idx_billing_entities_valid_dates ON public.billing_entities(valid_from, valid_until);
CREATE INDEX idx_offers_billing_entity_id ON public.offers(billing_entity_id);
CREATE INDEX idx_contracts_billing_entity_id ON public.contracts(billing_entity_id);

-- Enable RLS on billing_entities
ALTER TABLE public.billing_entities ENABLE ROW LEVEL SECURITY;

-- RLS policies for billing_entities
CREATE POLICY "Users can view billing entities for their company"
ON public.billing_entities
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Admin users can manage billing entities for their company"
ON public.billing_entities
FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_billing_entities_updated_at
BEFORE UPDATE ON public.billing_entities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();