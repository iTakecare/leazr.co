-- Add pack monthly pricing and promotional pricing fields to product_packs table
ALTER TABLE public.product_packs 
ADD COLUMN pack_monthly_price NUMERIC DEFAULT NULL,
ADD COLUMN pack_promo_price NUMERIC DEFAULT NULL,
ADD COLUMN promo_active BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN promo_valid_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN promo_valid_to TIMESTAMP WITH TIME ZONE DEFAULT NULL;