-- Create product_packs table
CREATE TABLE public.product_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  admin_only BOOLEAN NOT NULL DEFAULT false,
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_to TIMESTAMP WITH TIME ZONE,
  total_purchase_price NUMERIC NOT NULL DEFAULT 0,
  total_monthly_price NUMERIC NOT NULL DEFAULT 0,
  total_margin NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_pack_items table
CREATE TABLE public.product_pack_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID NOT NULL REFERENCES public.product_packs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  variant_price_id UUID,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_purchase_price NUMERIC NOT NULL DEFAULT 0,
  unit_monthly_price NUMERIC NOT NULL DEFAULT 0,
  margin_percentage NUMERIC NOT NULL DEFAULT 0,
  custom_price_override BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.product_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_pack_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for product_packs
CREATE POLICY "product_packs_company_isolation" 
ON public.product_packs 
FOR ALL 
USING ((company_id = get_user_company_id()) OR is_admin_optimized())
WITH CHECK ((company_id = get_user_company_id()) OR is_admin_optimized());

CREATE POLICY "product_packs_public_read" 
ON public.product_packs 
FOR SELECT 
USING (is_active = true AND NOT admin_only);

-- Create RLS policies for product_pack_items
CREATE POLICY "product_pack_items_company_access" 
ON public.product_pack_items 
FOR ALL 
USING (pack_id IN (
  SELECT id FROM public.product_packs 
  WHERE (company_id = get_user_company_id()) OR is_admin_optimized()
))
WITH CHECK (pack_id IN (
  SELECT id FROM public.product_packs 
  WHERE (company_id = get_user_company_id()) OR is_admin_optimized()
));

-- Create trigger for automatic timestamp updates on product_packs
CREATE OR REPLACE FUNCTION public.update_product_packs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_packs_updated_at
BEFORE UPDATE ON public.product_packs
FOR EACH ROW
EXECUTE FUNCTION public.update_product_packs_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_product_packs_company_id ON public.product_packs(company_id);
CREATE INDEX idx_product_packs_active ON public.product_packs(is_active);
CREATE INDEX idx_product_pack_items_pack_id ON public.product_pack_items(pack_id);
CREATE INDEX idx_product_pack_items_product_id ON public.product_pack_items(product_id);
CREATE INDEX idx_product_pack_items_position ON public.product_pack_items(pack_id, position);