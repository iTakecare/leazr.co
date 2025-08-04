-- Create table for client custom variant combinations
CREATE TABLE public.client_custom_variant_combinations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  product_id UUID NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}',
  custom_purchase_price NUMERIC,
  custom_monthly_price NUMERIC,
  margin_rate NUMERIC,
  notes TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique combinations per client/product
  UNIQUE(client_id, product_id, attributes)
);

-- Enable RLS
ALTER TABLE public.client_custom_variant_combinations ENABLE ROW LEVEL SECURITY;

-- Create policies for client custom variant combinations
CREATE POLICY "client_custom_variant_combinations_company_access" 
ON public.client_custom_variant_combinations 
FOR ALL 
USING (
  client_id IN (
    SELECT c.id 
    FROM clients c 
    WHERE c.company_id = get_user_company_id()
  ) OR is_admin_optimized()
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_client_custom_variant_combinations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_custom_variant_combinations_updated_at
BEFORE UPDATE ON public.client_custom_variant_combinations
FOR EACH ROW
EXECUTE FUNCTION public.update_client_custom_variant_combinations_updated_at();