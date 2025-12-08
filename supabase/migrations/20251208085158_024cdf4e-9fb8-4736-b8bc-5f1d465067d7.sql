-- Add has_custom_catalog flag to ambassadors table
ALTER TABLE ambassadors ADD COLUMN IF NOT EXISTS has_custom_catalog BOOLEAN DEFAULT false;

-- Create ambassador_custom_prices table (same structure as client_custom_prices)
CREATE TABLE IF NOT EXISTS ambassador_custom_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ambassador_id UUID NOT NULL REFERENCES ambassadors(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  custom_monthly_price NUMERIC NULL,
  custom_purchase_price NUMERIC NULL,
  margin_rate NUMERIC NULL,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_to TIMESTAMP WITH TIME ZONE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(ambassador_id, product_id)
);

-- Create ambassador_custom_variant_prices table (same structure as client_custom_variant_prices)
CREATE TABLE IF NOT EXISTS ambassador_custom_variant_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ambassador_id UUID NOT NULL REFERENCES ambassadors(id) ON DELETE CASCADE,
  variant_price_id UUID NOT NULL REFERENCES product_variant_prices(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  custom_monthly_price NUMERIC NULL,
  custom_purchase_price NUMERIC NULL,
  margin_rate NUMERIC NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(ambassador_id, variant_price_id)
);

-- Enable RLS on new tables
ALTER TABLE ambassador_custom_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ambassador_custom_variant_prices ENABLE ROW LEVEL SECURITY;

-- RLS policies for ambassador_custom_prices
CREATE POLICY "ambassador_custom_prices_company_isolation" 
ON ambassador_custom_prices 
FOR ALL 
USING ((company_id = get_user_company_id()) OR is_admin_optimized())
WITH CHECK ((company_id = get_user_company_id()) OR is_admin_optimized());

CREATE POLICY "ambassador_custom_prices_ambassador_access" 
ON ambassador_custom_prices 
FOR SELECT 
USING (ambassador_id IN (
  SELECT a.id FROM ambassadors a WHERE a.user_id = auth.uid()
));

-- RLS policies for ambassador_custom_variant_prices
CREATE POLICY "ambassador_custom_variant_prices_company_isolation" 
ON ambassador_custom_variant_prices 
FOR ALL 
USING ((company_id = get_user_company_id()) OR is_admin_optimized())
WITH CHECK ((company_id = get_user_company_id()) OR is_admin_optimized());

CREATE POLICY "ambassador_custom_variant_prices_ambassador_access" 
ON ambassador_custom_variant_prices 
FOR SELECT 
USING (ambassador_id IN (
  SELECT a.id FROM ambassadors a WHERE a.user_id = auth.uid()
));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ambassador_custom_prices_ambassador ON ambassador_custom_prices(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_ambassador_custom_prices_product ON ambassador_custom_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_ambassador_custom_prices_company ON ambassador_custom_prices(company_id);
CREATE INDEX IF NOT EXISTS idx_ambassador_custom_variant_prices_ambassador ON ambassador_custom_variant_prices(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_ambassador_custom_variant_prices_variant ON ambassador_custom_variant_prices(variant_price_id);