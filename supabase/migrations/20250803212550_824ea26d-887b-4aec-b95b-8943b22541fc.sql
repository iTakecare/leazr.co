-- Add missing notes column to client_custom_variant_prices table
ALTER TABLE public.client_custom_variant_prices 
ADD COLUMN notes TEXT;