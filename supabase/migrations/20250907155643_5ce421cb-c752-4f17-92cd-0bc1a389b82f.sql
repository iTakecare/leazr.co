-- Create function to update offer leaser_id
CREATE OR REPLACE FUNCTION public.update_offer_leaser(p_offer_id uuid, p_leaser_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.offers 
  SET leaser_id = p_leaser_id, updated_at = now()
  WHERE id = p_offer_id AND company_id = get_user_company_id();
  
  RETURN FOUND;
END;
$$;