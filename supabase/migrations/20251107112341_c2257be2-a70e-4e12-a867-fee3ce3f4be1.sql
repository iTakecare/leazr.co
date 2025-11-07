-- Fix security warning: Set search_path for generate_offer_number function
CREATE OR REPLACE FUNCTION generate_offer_number()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.offer_number IS NULL THEN
    NEW.offer_number := 'OFF-' || 
                        EXTRACT(YEAR FROM NEW.created_at)::TEXT || '-' ||
                        UPPER(SUBSTRING(NEW.id::text, 1, 8));
  END IF;
  RETURN NEW;
END;
$$;