
-- Add discount columns to offers table (global discount)
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS discount_type text,
ADD COLUMN IF NOT EXISTS discount_value numeric,
ADD COLUMN IF NOT EXISTS discount_amount numeric,
ADD COLUMN IF NOT EXISTS monthly_payment_before_discount numeric;

-- Add discount columns to offer_equipment table (per-line discount)
ALTER TABLE public.offer_equipment 
ADD COLUMN IF NOT EXISTS discount_type text,
ADD COLUMN IF NOT EXISTS discount_value numeric,
ADD COLUMN IF NOT EXISTS discount_amount numeric,
ADD COLUMN IF NOT EXISTS monthly_payment_before_discount numeric;
