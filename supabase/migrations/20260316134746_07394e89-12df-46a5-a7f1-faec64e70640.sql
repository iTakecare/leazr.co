
-- Drop the obsolete 19-parameter version of insert_offer_equipment_secure
-- This version silently ignores product_id and image_url parameters
DROP FUNCTION IF EXISTS public.insert_offer_equipment_secure(
  uuid, text, numeric, integer, numeric, numeric, numeric, numeric, 
  text, uuid, uuid, text, text, text, text, text, text, text, text
);
