
-- Créer une fonction SECURITY DEFINER pour lier un client à un ambassadeur
CREATE OR REPLACE FUNCTION public.link_client_to_ambassador_secure(p_user_id uuid, p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  ambassador_rec RECORD;
BEGIN
  -- Vérifier que l'utilisateur a un profil ambassadeur
  SELECT id, company_id INTO ambassador_rec 
  FROM public.ambassadors 
  WHERE user_id = p_user_id 
  LIMIT 1;
  
  -- Si pas d'ambassadeur trouvé, retourner false
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Vérifier si le lien existe déjà
  IF EXISTS (
    SELECT 1 FROM public.ambassador_clients 
    WHERE ambassador_id = ambassador_rec.id AND client_id = p_client_id
  ) THEN
    RETURN true; -- Déjà lié
  END IF;
  
  -- Créer le lien
  INSERT INTO public.ambassador_clients (ambassador_id, client_id)
  VALUES (ambassador_rec.id, p_client_id);
  
  RETURN true;
END;
$$;

-- Créer une fonction SECURITY DEFINER pour délier un client d'un ambassadeur
CREATE OR REPLACE FUNCTION public.unlink_client_from_ambassador_secure(p_user_id uuid, p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  ambassador_rec RECORD;
BEGIN
  -- Vérifier que l'utilisateur a un profil ambassadeur
  SELECT id, company_id INTO ambassador_rec 
  FROM public.ambassadors 
  WHERE user_id = p_user_id 
  LIMIT 1;
  
  -- Si pas d'ambassadeur trouvé, retourner false
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Supprimer le lien
  DELETE FROM public.ambassador_clients 
  WHERE ambassador_id = ambassador_rec.id AND client_id = p_client_id;
  
  RETURN FOUND;
END;
$$;

-- Créer une fonction SECURITY DEFINER pour compter les clients d'un ambassadeur
CREATE OR REPLACE FUNCTION public.count_ambassador_clients_secure(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  ambassador_rec RECORD;
  client_count integer;
BEGIN
  -- Vérifier que l'utilisateur a un profil ambassadeur
  SELECT id, company_id INTO ambassador_rec 
  FROM public.ambassadors 
  WHERE user_id = p_user_id 
  LIMIT 1;
  
  -- Si pas d'ambassadeur trouvé, retourner 0
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Compter les clients liés à cet ambassadeur
  SELECT COUNT(*) INTO client_count
  FROM public.ambassador_clients ac
  WHERE ac.ambassador_id = ambassador_rec.id;
  
  RETURN client_count;
END;
$$;
