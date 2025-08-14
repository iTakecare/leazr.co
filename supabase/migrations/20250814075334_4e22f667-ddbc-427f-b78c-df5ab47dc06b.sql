-- Final Security Fix: Set search_path for remaining database functions
-- This addresses the security linter warning about mutable search paths

-- Fix functions with security implications
CREATE OR REPLACE FUNCTION public.activate_prospect(p_activation_token text)
RETURNS TABLE(success boolean, user_id uuid, company_id uuid, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  prospect_record RECORD;
  new_user_id uuid;
  new_company_id uuid;
BEGIN
  -- Récupérer le prospect
  SELECT * INTO prospect_record
  FROM prospects 
  WHERE activation_token = p_activation_token 
    AND status = 'active' 
    AND trial_ends_at > now();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, null::uuid, null::uuid, 'Token invalide ou expiré';
    RETURN;
  END IF;
  
  -- Créer l'utilisateur dans auth.users (simulation - en réalité fait via edge function)
  -- Cette partie sera gérée par l'edge function
  
  -- Marquer le prospect comme activé
  UPDATE prospects 
  SET 
    status = 'converted',
    activated_at = now(),
    converted_at = now(),
    updated_at = now()
  WHERE id = prospect_record.id;
  
  RETURN QUERY SELECT true, new_user_id, new_company_id, 'Prospect activé avec succès';
END;
$function$;

-- Fix apply_permission_profile function
CREATE OR REPLACE FUNCTION public.apply_permission_profile(p_user_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Fix can_manage_users function
CREATE OR REPLACE FUNCTION public.can_manage_users()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
END;
$function$;