-- Create table for client-specific custom variants
CREATE TABLE public.client_custom_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  product_id UUID NOT NULL,
  variant_name TEXT NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}',
  custom_purchase_price NUMERIC(10,2),
  custom_monthly_price NUMERIC(10,2),
  margin_rate NUMERIC(5,2),
  notes TEXT,
  company_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, product_id, variant_name)
);

-- Enable Row Level Security
ALTER TABLE public.client_custom_variants ENABLE ROW LEVEL SECURITY;

-- Create policies for client custom variants
CREATE POLICY "Users can view client custom variants from their company" 
ON public.client_custom_variants 
FOR SELECT 
USING (company_id = get_user_company_id());

CREATE POLICY "Users can create client custom variants for their company" 
ON public.client_custom_variants 
FOR INSERT 
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update client custom variants from their company" 
ON public.client_custom_variants 
FOR UPDATE 
USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete client custom variants from their company" 
ON public.client_custom_variants 
FOR DELETE 
USING (company_id = get_user_company_id());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_client_custom_variants_updated_at
BEFORE UPDATE ON public.client_custom_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_client_custom_variant_prices_updated_at();