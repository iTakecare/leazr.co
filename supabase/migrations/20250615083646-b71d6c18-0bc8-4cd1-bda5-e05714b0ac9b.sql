-- Corriger la fonction apply_permission_profile pour résoudre l'ambiguïté de permission_id
CREATE OR REPLACE FUNCTION public.apply_permission_profile(p_user_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_permissions jsonb;
  permission_id uuid;
BEGIN
  -- Récupérer les permissions du profil
  SELECT permissions INTO profile_permissions 
  FROM public.permission_profiles 
  WHERE id = p_profile_id;
  
  IF profile_permissions IS NULL THEN
    RETURN false;
  END IF;
  
  -- Supprimer toutes les permissions existantes de l'utilisateur
  DELETE FROM public.user_permissions WHERE user_id = p_user_id;
  
  -- Ajouter les nouvelles permissions
  FOR permission_id IN SELECT jsonb_array_elements_text(profile_permissions)::uuid
  LOOP
    INSERT INTO public.user_permissions (user_id, permission_id, granted, granted_by)
    VALUES (p_user_id, permission_id, true, auth.uid());
  END LOOP;
  
  RETURN true;
END;
$$;