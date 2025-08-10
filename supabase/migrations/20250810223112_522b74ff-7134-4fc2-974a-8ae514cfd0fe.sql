-- Correction des avertissements de sécurité - Fonction search_path
CREATE OR REPLACE FUNCTION public.update_category_environmental_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public';