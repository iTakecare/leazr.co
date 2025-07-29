-- Add leaser_id and selected_duration to product_packs table
ALTER TABLE public.product_packs 
ADD COLUMN leaser_id UUID REFERENCES public.leasers(id),
ADD COLUMN selected_duration INTEGER DEFAULT 36;