
-- Fonction améliorée pour gérer la création d'utilisateurs avec company_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  matched_client_id uuid;
  client_company_id uuid;
  default_company_id uuid;
BEGIN
  -- First try to find an existing client with matching email
  SELECT id, company_id INTO matched_client_id, client_company_id
  FROM public.clients
  WHERE email = NEW.email
  LIMIT 1;

  -- If no client found, get the default iTakecare company
  IF matched_client_id IS NULL THEN
    SELECT id INTO default_company_id
    FROM public.companies
    WHERE name = 'iTakecare (Default)'
    LIMIT 1;
    
    -- If no default company exists, create one
    IF default_company_id IS NULL THEN
      INSERT INTO public.companies (name, plan, is_active)
      VALUES ('iTakecare (Default)', 'business', true)
      RETURNING id INTO default_company_id;
    END IF;
  END IF;

  -- Insert into profiles with appropriate company_id
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    role,
    company,
    client_id,
    company_id
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    COALESCE(NEW.raw_user_meta_data->>'company', ''),
    matched_client_id,
    COALESCE(client_company_id, default_company_id)
  );

  -- If we found a matching client, update its user_id
  IF matched_client_id IS NOT NULL THEN
    UPDATE public.clients
    SET 
      user_id = NEW.id,
      has_user_account = true,
      user_account_created_at = NOW()
    WHERE id = matched_client_id;
  END IF;

  RETURN NEW;
END;
$$;
