ALTER TABLE offers DROP CONSTRAINT IF EXISTS check_offer_type;
ALTER TABLE offers ADD CONSTRAINT check_offer_type 
  CHECK (type = ANY (ARRAY[
    'ambassador_offer', 'offer', 'client_request', 'internal_offer', 
    'admin_offer', 'web_request', 'custom_pack_request', 'purchase_request', 
    'self_leasing', 'partner_request'
  ]));