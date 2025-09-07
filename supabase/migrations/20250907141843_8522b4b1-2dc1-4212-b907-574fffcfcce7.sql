-- Update the check constraint to include web_request
ALTER TABLE offers DROP CONSTRAINT IF EXISTS check_offer_type;

-- Add the updated constraint with web_request included
ALTER TABLE offers ADD CONSTRAINT check_offer_type 
CHECK (type IN ('ambassador_offer', 'offer', 'client_request', 'internal_offer', 'partner_offer', 'admin_offer', 'web_request'));