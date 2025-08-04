-- Add hidden_variants array to clients table to track which standard variants are hidden for each client
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS hidden_variants uuid[] DEFAULT ARRAY[]::uuid[];

-- Add comment to explain the column
COMMENT ON COLUMN public.clients.hidden_variants IS 'Array of variant_price_ids that are hidden from this client catalog';