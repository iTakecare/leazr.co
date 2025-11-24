-- Supprimer l'ancienne contrainte check_offer_type
ALTER TABLE offers 
DROP CONSTRAINT IF EXISTS check_offer_type;

-- Recréer la contrainte avec la nouvelle valeur custom_pack_request incluse
ALTER TABLE offers 
ADD CONSTRAINT check_offer_type 
CHECK (type = ANY (ARRAY[
  'ambassador_offer'::text,
  'offer'::text,
  'client_request'::text,
  'internal_offer'::text,
  'partner_offer'::text,
  'admin_offer'::text,
  'web_request'::text,
  'custom_pack_request'::text
]));