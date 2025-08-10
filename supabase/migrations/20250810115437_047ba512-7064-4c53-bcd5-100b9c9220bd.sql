-- Fix search path security issue for the function we just created
CREATE OR REPLACE FUNCTION public.update_api_keys_updated_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;