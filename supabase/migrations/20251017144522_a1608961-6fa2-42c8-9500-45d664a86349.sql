-- Add business_sector column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS business_sector TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN public.clients.business_sector IS 'Secteur d''activité du client (ex: Médical, Industriel, Services, etc.)';

-- Add index for better performance when filtering by sector
CREATE INDEX IF NOT EXISTS idx_clients_business_sector 
ON public.clients(business_sector) 
WHERE business_sector IS NOT NULL;