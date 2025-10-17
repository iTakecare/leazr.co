-- Ajouter le champ request_date à la table offers
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS request_date TIMESTAMP WITH TIME ZONE;

-- Initialiser request_date avec created_at pour les offres existantes
UPDATE public.offers 
SET request_date = created_at 
WHERE request_date IS NULL;

-- Fonction sécurisée pour mettre à jour la date de demande
CREATE OR REPLACE FUNCTION public.update_offer_request_date_secure(
  p_offer_id UUID,
  p_new_date TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN
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
  
  -- Mettre à jour la date de demande
  UPDATE public.offers
  SET request_date = p_new_date,
      updated_at = NOW()
  WHERE id = p_offer_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;