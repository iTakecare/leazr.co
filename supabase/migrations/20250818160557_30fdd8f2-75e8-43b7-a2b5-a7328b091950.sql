-- Add duration column to offer_equipment table
ALTER TABLE public.offer_equipment 
ADD COLUMN duration INTEGER DEFAULT 36 NOT NULL;