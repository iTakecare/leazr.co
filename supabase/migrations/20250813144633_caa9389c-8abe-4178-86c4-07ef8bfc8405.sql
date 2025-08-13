-- Add address fields to collaborators table
ALTER TABLE public.collaborators 
ADD COLUMN address text,
ADD COLUMN city text, 
ADD COLUMN postal_code text,
ADD COLUMN country text DEFAULT 'BE';