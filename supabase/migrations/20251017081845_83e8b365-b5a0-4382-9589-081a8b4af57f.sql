-- Fonction sécurisée pour mettre à jour la date de création d'une offre
CREATE OR REPLACE FUNCTION update_offer_date_secure(
  p_offer_id UUID,
  p_new_date TIMESTAMPTZ
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_company_id UUID;
  offer_company_id UUID;
BEGIN
  -- Récupérer le company_id de l'utilisateur
  user_company_id := get_user_company_id();
  
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: User company not found';
  END IF;
  
  -- Vérifier que l'offre appartient à la même entreprise
  SELECT company_id INTO offer_company_id
  FROM public.offers
  WHERE id = p_offer_id;
  
  IF offer_company_id IS NULL THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;
  
  IF offer_company_id != user_company_id AND NOT is_admin_optimized() THEN
    RAISE EXCEPTION 'Access denied: Offer belongs to different company';
  END IF;
  
  -- Mettre à jour la date
  UPDATE public.offers
  SET created_at = p_new_date,
      updated_at = NOW()
  WHERE id = p_offer_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;