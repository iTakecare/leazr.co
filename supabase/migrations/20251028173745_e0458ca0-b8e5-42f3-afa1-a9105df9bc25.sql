-- Supprimer le trigger qui cause le problème et créer l'utilisateur correctement

-- 1. Supprimer le trigger problématique
DROP TRIGGER IF EXISTS on_auth_user_created_broker_demo ON auth.users;
DROP FUNCTION IF EXISTS public.create_broker_demo_profile();

-- 2. Créer l'utilisateur broker avec les bonnes données
DO $$
DECLARE
  broker_company_id UUID;
  new_user_id UUID;
BEGIN
  -- Récupérer l'ID du broker
  SELECT id INTO broker_company_id 
  FROM public.companies 
  WHERE slug = 'broker-demo' AND company_type = 'broker'
  LIMIT 1;

  IF broker_company_id IS NULL THEN
    RAISE EXCEPTION 'Broker Demo company not found';
  END IF;

  -- Générer un nouvel UUID pour l'utilisateur
  new_user_id := gen_random_uuid();

  -- Insérer directement dans auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    aud,
    role
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'broker_demo@itakecare.be',
    crypt('B7k#mP9$xL2@nQ5w', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Broker","last_name":"Demo"}'::jsonb,
    NOW(),
    NOW(),
    '',
    'authenticated',
    'authenticated'
  );

  -- Créer le profil associé avec le rôle 'admin'
  INSERT INTO public.profiles (
    id,
    company_id,
    first_name,
    last_name,
    role
  ) VALUES (
    new_user_id,
    broker_company_id,
    'Broker',
    'Demo',
    'admin'
  );

  RAISE NOTICE '✅ Utilisateur broker créé: broker_demo@itakecare.be';
  RAISE NOTICE '🔑 Mot de passe: B7k#mP9$xL2@nQ5w';
END $$;