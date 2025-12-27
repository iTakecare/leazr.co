-- Supprimer l'ancienne contrainte check_offer_type
ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS check_offer_type;

-- Recréer la contrainte avec self_leasing inclus
ALTER TABLE public.offers ADD CONSTRAINT check_offer_type 
CHECK (type = ANY (ARRAY[
  'ambassador_offer'::text, 
  'offer'::text, 
  'client_request'::text, 
  'internal_offer'::text, 
  'admin_offer'::text, 
  'web_request'::text, 
  'custom_pack_request'::text, 
  'purchase_request'::text,
  'self_leasing'::text
]));