-- Add contact_name field to clients table
ALTER TABLE public.clients 
ADD COLUMN contact_name TEXT;