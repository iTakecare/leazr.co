-- Add first_name and last_name columns to clients table
ALTER TABLE public.clients 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT;

-- Update existing clients to split name into first_name and last_name
UPDATE public.clients 
SET 
  first_name = SPLIT_PART(name, ' ', 1),
  last_name = CASE 
    WHEN POSITION(' ' IN name) > 0 THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
    ELSE ''
  END
WHERE name IS NOT NULL AND name != '';

-- Create index for better performance on name searches
CREATE INDEX idx_clients_first_last_name ON public.clients (first_name, last_name);