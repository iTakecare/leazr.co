-- Add 'purchase_request' to the check constraint on offers.type
ALTER TABLE offers DROP CONSTRAINT IF EXISTS check_offer_type;
ALTER TABLE offers ADD CONSTRAINT check_offer_type 
CHECK (type IN ('ambassador_offer', 'offer', 'client_request', 'internal_offer', 'admin_offer', 'web_request', 'custom_pack_request', 'purchase_request'));