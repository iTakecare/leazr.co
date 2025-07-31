-- Add use_duration_coefficients column to leasers table
ALTER TABLE public.leasers 
ADD COLUMN use_duration_coefficients boolean NOT NULL DEFAULT false;