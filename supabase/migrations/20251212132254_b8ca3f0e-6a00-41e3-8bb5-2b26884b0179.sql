-- Add missing columns for self-leasing contract functionality
ALTER TABLE contracts 
  ADD COLUMN IF NOT EXISTS client_email TEXT,
  ADD COLUMN IF NOT EXISTS contract_duration INTEGER DEFAULT 36,
  ADD COLUMN IF NOT EXISTS leaser_id UUID REFERENCES leasers(id);

-- Update existing contracts with client_email from linked offers
UPDATE contracts c
SET client_email = o.client_email
FROM offers o
WHERE c.offer_id = o.id AND c.client_email IS NULL;

-- Create index for leaser_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_contracts_leaser_id ON contracts(leaser_id);