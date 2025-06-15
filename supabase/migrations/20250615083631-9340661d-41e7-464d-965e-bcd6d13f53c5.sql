-- Corriger la fonction apply_permission_profile
CREATE OR REPLACE FUNCTION public.apply_permission_profile(p_user_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_permissions jsonb;
  perm_id text;
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
  FOR perm_id IN SELECT jsonb_array_elements_text(profile_permissions)
  LOOP
    INSERT INTO public.user_permissions (user_id, permission_id, granted, granted_by)
    VALUES (p_user_id, perm_id::uuid, true, auth.uid())
    ON CONFLICT (user_id, permission_id) DO UPDATE SET
      granted = true,
      granted_by = auth.uid(),
      granted_at = now();
  END LOOP;
  
  RETURN true;
END;
$$;