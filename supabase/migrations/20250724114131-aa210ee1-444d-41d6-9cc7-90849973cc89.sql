-- Remove duplicate foreign key constraint to avoid relationship ambiguity
ALTER TABLE public.product_pack_items 
DROP CONSTRAINT IF EXISTS product_pack_items_pack_id_fkey;