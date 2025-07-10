-- Correction des avertissements de sécurité Supabase
-- Ajout de SET search_path TO 'public' aux fonctions SECURITY DEFINER

-- Fonction get_user_company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_company_id uuid;
BEGIN
  SELECT company_id INTO user_company_id 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  RETURN user_company_id;
END;
$function$;

-- Fonction update_permission_profiles_updated_at
CREATE OR REPLACE FUNCTION public.update_permission_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fonction apply_permission_profile
CREATE OR REPLACE FUNCTION public.apply_permission_profile(p_user_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  permission_record RECORD;
BEGIN
  -- Supprimer les permissions existantes de l'utilisateur
  DELETE FROM public.user_permissions WHERE user_id = p_user_id;
  
  -- Ajouter les nouvelles permissions du profil
  FOR permission_record IN 
    SELECT permission_name FROM public.permission_profile_permissions 
    WHERE profile_id = p_profile_id
  LOOP
    INSERT INTO public.user_permissions (user_id, permission_name)
    VALUES (p_user_id, permission_record.permission_name);
  END LOOP;
  
  RETURN true;
END;
$function$;

-- Fonction is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
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

-- Fonction is_admin_optimized
CREATE OR REPLACE FUNCTION public.is_admin_optimized()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
$function$;

-- Fonction refresh_admin_pending_requests
CREATE OR REPLACE FUNCTION public.refresh_admin_pending_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.admin_pending_requests;
  
  INSERT INTO public.admin_pending_requests (
    id, user_id, client_id, amount, coefficient, commission,
    client_name, client_email, updated_at, workflow_status,
    status, equipment_description, created_at, client_company,
    converted_to_contract, client_contact_email, monthly_payment
  )
  SELECT 
    o.id, o.user_id, o.client_id, o.amount, o.coefficient, o.commission,
    o.client_name, o.client_email, o.updated_at, o.workflow_status,
    o.status, o.equipment_description, o.created_at, 
    c.company as client_company, o.converted_to_contract,
    c.email as client_contact_email, o.monthly_payment
  FROM public.offers o
  LEFT JOIN public.clients c ON o.client_id = c.id
  WHERE o.status IN ('pending', 'approved');
END;
$function$;

-- Fonction trigger_refresh_admin_pending_requests
CREATE OR REPLACE FUNCTION public.trigger_refresh_admin_pending_requests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.refresh_admin_pending_requests();
  RETURN NULL;
END;
$function$;

-- Fonction update_offer_margins
CREATE OR REPLACE FUNCTION public.update_offer_margins()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  offer_record RECORD;
  total_margin NUMERIC := 0;
  equipment_item JSONB;
BEGIN
  FOR offer_record IN SELECT id, equipment_description FROM public.offers
  LOOP
    total_margin := 0;
    
    IF offer_record.equipment_description IS NOT NULL THEN
      FOR equipment_item IN SELECT * FROM jsonb_array_elements(offer_record.equipment_description::jsonb)
      LOOP
        IF equipment_item ? 'margin' THEN
          total_margin := total_margin + (equipment_item->>'margin')::NUMERIC;
        END IF;
      END LOOP;
      
      UPDATE public.offers 
      SET margin = total_margin 
      WHERE id = offer_record.id;
    END IF;
  END LOOP;
END;
$function$;

-- Fonction check_bucket_exists
CREATE OR REPLACE FUNCTION public.check_bucket_exists(bucket_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM storage.buckets 
    WHERE name = bucket_name
  );
END;
$function$;

-- Fonction create_storage_bucket
CREATE OR REPLACE FUNCTION public.create_storage_bucket(bucket_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.check_bucket_exists(bucket_name) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES (bucket_name, bucket_name, true);
    
    -- Créer des politiques de base
    PERFORM public.create_storage_policy(
      bucket_name, 
      bucket_name || '_select_policy',
      'true',
      'SELECT'
    );
    
    PERFORM public.create_storage_policy(
      bucket_name,
      bucket_name || '_insert_policy', 
      'true',
      'INSERT'
    );
  END IF;
END;
$function$;

-- Fonction create_storage_policy
CREATE OR REPLACE FUNCTION public.create_storage_policy(bucket_name text, policy_name text, definition text, policy_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = policy_name
  ) THEN
    EXECUTE format(
      'CREATE POLICY %I ON storage.objects FOR %s USING (%s)',
      policy_name, policy_type, definition
    );
  END IF;
END;
$function$;

-- Fonction get_offer_by_id_public
CREATE OR REPLACE FUNCTION public.get_offer_by_id_public(offer_id uuid)
RETURNS SETOF offers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT * FROM public.offers WHERE id = offer_id;
END;
$function$;

-- Fonction handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  default_company_id uuid;
  existing_client_id uuid;
BEGIN
  -- Rechercher une entreprise par défaut ou créer iTakecare
  SELECT id INTO default_company_id 
  FROM public.companies 
  WHERE name = 'iTakecare' 
  LIMIT 1;
  
  IF default_company_id IS NULL THEN
    INSERT INTO public.companies (name, plan)
    VALUES ('iTakecare', 'enterprise')
    RETURNING id INTO default_company_id;
  END IF;
  
  -- Rechercher un client existant avec cet email
  SELECT id INTO existing_client_id
  FROM public.clients
  WHERE email = NEW.email
  LIMIT 1;
  
  -- Créer le profil utilisateur
  INSERT INTO public.profiles (
    id, 
    first_name, 
    last_name, 
    company_id,
    role
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    default_company_id,
    'user'
  );
  
  -- Lier au client existant si trouvé
  IF existing_client_id IS NOT NULL THEN
    UPDATE public.clients 
    SET user_id = NEW.id, 
        has_user_account = true,
        user_account_created_at = now()
    WHERE id = existing_client_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fonction get_current_user_role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'user');
END;
$function$;