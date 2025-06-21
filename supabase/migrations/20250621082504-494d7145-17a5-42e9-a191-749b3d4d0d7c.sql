
-- Ajouter la colonne is_ambassador_client à la table clients
ALTER TABLE public.clients 
ADD COLUMN is_ambassador_client boolean DEFAULT false;

-- Mettre à jour la fonction create_client_as_ambassador pour ne plus utiliser is_ambassador_client
CREATE OR REPLACE FUNCTION public.create_client_as_ambassador(client_data jsonb, ambassador_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_client_id UUID;
  ambassador_company_id UUID;
BEGIN
  -- Récupérer le company_id de l'ambassadeur
  SELECT company_id INTO ambassador_company_id
  FROM public.ambassadors
  WHERE id = ambassador_id;
  
  -- Vérifier que l'ambassadeur existe et a un company_id
  IF ambassador_company_id IS NULL THEN
    RAISE EXCEPTION 'Ambassadeur introuvable ou sans company_id: %', ambassador_id;
  END IF;
  
  -- Créer le client avec le company_id de l'ambassadeur
  INSERT INTO public.clients (
    name, email, company, phone, address, notes, status, vat_number, 
    city, postal_code, country, company_id, is_ambassador_client
  )
  VALUES (
    client_data->>'name', 
    client_data->>'email', 
    client_data->>'company', 
    client_data->>'phone',
    client_data->>'address', 
    client_data->>'notes', 
    COALESCE(client_data->>'status', 'active'),
    client_data->>'vat_number', 
    client_data->>'city', 
    client_data->>'postal_code', 
    client_data->>'country',
    ambassador_company_id,
    true  -- Marquer comme client ambassadeur
  )
  RETURNING id INTO new_client_id;

  -- Créer le lien dans ambassador_clients
  INSERT INTO public.ambassador_clients (ambassador_id, client_id)
  VALUES (ambassador_id, new_client_id);

  RETURN new_client_id;
END;
$$;
