-- Add iframe dimension columns to company_customizations table
ALTER TABLE public.company_customizations 
ADD COLUMN iframe_width TEXT,
ADD COLUMN iframe_height TEXT;