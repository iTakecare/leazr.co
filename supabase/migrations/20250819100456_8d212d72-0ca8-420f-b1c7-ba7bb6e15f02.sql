-- Recréer la fonction create_company_user sans gen_salt() ni crypt()
CREATE OR REPLACE FUNCTION public.create_company_user(
  p_email text,
  p_password text,
  p_first_name text,
  p_last_name text,
  p_role text,
  p_company_id uuid
)
RETURNS TABLE(success boolean, message text, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_user_id uuid;
  profile_exists boolean;
BEGIN
  -- Vérifier si l'utilisateur existe déjà
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RETURN QUERY SELECT false, 'Un utilisateur avec cet email existe déjà'::text, null::uuid;
    RETURN;
  END IF;
  
  -- Vérifier si l'entreprise existe
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_company_id) THEN
    RETURN QUERY SELECT false, 'Entreprise non trouvée'::text, null::uuid;
    RETURN;
  END IF;
  
  -- Générer un UUID pour le nouvel utilisateur
  new_user_id := gen_random_uuid();
  
  -- Créer le profil directement (l'utilisateur sera créé par l'edge function)
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    role,
    company_id,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    p_first_name,
    p_last_name,
    p_role,
    p_company_id,
    now(),
    now()
  );
  
  RETURN QUERY SELECT true, 'Utilisateur créé avec succès'::text, new_user_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, nettoyer les données créées
    DELETE FROM public.profiles WHERE id = new_user_id;
    
    RETURN QUERY SELECT false, ('Erreur lors de la création: ' || SQLERRM)::text, null::uuid;
END;
$$;