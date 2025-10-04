-- Add missing duration column to offers to fix update error
ALTER TABLE public.offers
ADD COLUMN IF NOT EXISTS duration integer;