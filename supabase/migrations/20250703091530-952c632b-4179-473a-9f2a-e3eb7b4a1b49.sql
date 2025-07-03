-- Create table for company integrations (Billit API keys, etc.)
CREATE TABLE public.company_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('billit', 'other')),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  api_credentials JSONB NOT NULL DEFAULT '{}',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, integration_type)
);

-- Create table for tracking invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  leaser_name TEXT NOT NULL,
  external_invoice_id TEXT, -- ID from Billit or other system
  invoice_number TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  generated_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  due_date DATE,
  billing_data JSONB NOT NULL DEFAULT '{}', -- Equipment details, etc.
  integration_type TEXT NOT NULL DEFAULT 'billit',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add invoice_generated field to contracts
ALTER TABLE public.contracts 
ADD COLUMN invoice_generated BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN invoice_id UUID REFERENCES public.invoices(id);

-- Enable RLS on new tables
ALTER TABLE public.company_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_integrations
CREATE POLICY "company_integrations_company_access" 
ON public.company_integrations 
FOR ALL 
USING (company_id = get_user_company_id() OR is_admin_optimized());

-- RLS policies for invoices
CREATE POLICY "invoices_company_access" 
ON public.invoices 
FOR ALL 
USING (company_id = get_user_company_id() OR is_admin_optimized());

-- Create indexes for performance
CREATE INDEX idx_company_integrations_company_id ON public.company_integrations(company_id);
CREATE INDEX idx_company_integrations_type ON public.company_integrations(company_id, integration_type);
CREATE INDEX idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX idx_invoices_contract_id ON public.invoices(contract_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);

-- Create update trigger for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_integrations_updated_at
  BEFORE UPDATE ON public.company_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();