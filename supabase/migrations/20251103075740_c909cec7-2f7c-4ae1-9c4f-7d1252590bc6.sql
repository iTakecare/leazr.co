-- Migration 4: Synchroniser profiles.role vers user_roles
-- Cette migration garantit que toutes les données de rôles existantes sont dans user_roles

-- 1. Synchronisation initiale des rôles existants
DO $$
DECLARE
  profile_record RECORD;
  role_exists BOOLEAN;
  sync_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting role synchronization from profiles to user_roles...';
  
  -- Pour chaque profil avec un rôle défini
  FOR profile_record IN 
    SELECT id, role 
    FROM public.profiles 
    WHERE role IS NOT NULL 
      AND role != ''
  LOOP
    -- Vérifier si le rôle existe déjà dans user_roles
    SELECT EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = profile_record.id 
        AND role = profile_record.role::public.app_role
    ) INTO role_exists;
    
    -- Insérer seulement si le rôle n'existe pas déjà
    IF NOT role_exists THEN
      BEGIN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (profile_record.id, profile_record.role::public.app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        sync_count := sync_count + 1;
        RAISE NOTICE 'Synced role % for user %', profile_record.role, profile_record.id;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Failed to sync role % for user %: %', 
            profile_record.role, profile_record.id, SQLERRM;
      END;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Role synchronization complete. Synced % roles.', sync_count;
END $$;

-- 2. Créer un trigger pour maintenir la synchronisation temporairement
-- Ce trigger sera retiré une fois la migration complète validée
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Quand profiles.role change, mettre à jour user_roles
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Supprimer l'ancien rôle si présent
    IF OLD.role IS NOT NULL AND OLD.role != '' THEN
      DELETE FROM public.user_roles 
      WHERE user_id = NEW.id 
        AND role = OLD.role::public.app_role;
    END IF;
    
    -- Ajouter le nouveau rôle si présent
    IF NEW.role IS NOT NULL AND NEW.role != '' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, NEW.role::public.app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_profile_role_trigger
AFTER UPDATE OF role ON public.profiles
FOR EACH ROW
WHEN (OLD.role IS DISTINCT FROM NEW.role)
EXECUTE FUNCTION public.sync_profile_role_to_user_roles();

-- 3. Vérification de la synchronisation
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = p.role::public.app_role
  WHERE p.role IS NOT NULL 
    AND p.role != ''
    AND ur.user_id IS NULL;
  
  IF missing_count > 0 THEN
    RAISE WARNING '% profiles still have unsynchronized roles', missing_count;
  ELSE
    RAISE NOTICE 'All roles successfully synchronized!';
  END IF;
END $$;