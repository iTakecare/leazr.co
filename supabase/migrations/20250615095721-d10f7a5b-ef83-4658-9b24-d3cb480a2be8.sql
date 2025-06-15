-- Corriger les 14 dernières fonctions restantes pour éliminer tous les warnings

-- 1. Fonction get_user_company_id - correction SET search_path
CREATE OR REPLACE FUNCTION public.get_user_company_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$function$;

-- 2. Fonction update_permission_profiles_updated_at - correction SET search_path
CREATE OR REPLACE FUNCTION public.update_permission_profiles_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3. Fonction apply_permission_profile - correction SET search_path
CREATE OR REPLACE FUNCTION public.apply_permission_profile(p_user_id uuid, p_profile_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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

-- 4. Fonction is_admin - correction SET search_path
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = auth
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' IN ('admin', 'super_admin')
  );
$function$;

-- 5. Fonction refresh_admin_pending_requests - correction SET search_path
CREATE OR REPLACE FUNCTION public.refresh_admin_pending_requests()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Vider la table
  DELETE FROM public.admin_pending_requests;
  
  -- Insérer les données actuelles depuis les offres
  INSERT INTO public.admin_pending_requests (
    id, user_id, client_id, client_name, client_email, client_contact_email,
    client_company, amount, coefficient, monthly_payment, commission,
    equipment_description, status, workflow_status, converted_to_contract,
    created_at, updated_at
  )
  SELECT 
    o.id,
    o.user_id,
    o.client_id,
    o.client_name,
    o.client_email,
    c.email as client_contact_email,
    c.company as client_company,
    o.amount,
    o.coefficient,
    o.monthly_payment,
    o.commission,
    o.equipment_description,
    o.status,
    o.workflow_status,
    o.converted_to_contract,
    o.created_at,
    o.updated_at
  FROM public.offers o
  LEFT JOIN public.clients c ON o.client_id = c.id
  WHERE o.status IN ('pending', 'sent', 'approved')
  AND o.workflow_status IS NOT NULL;
END;
$function$;

-- 6. Fonction trigger_refresh_admin_pending_requests - correction SET search_path
CREATE OR REPLACE FUNCTION public.trigger_refresh_admin_pending_requests()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  PERFORM public.refresh_admin_pending_requests();
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 7. Fonction update_offer_margins - correction SET search_path
CREATE OR REPLACE FUNCTION public.update_offer_margins()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  offer_record RECORD;
  equipment_data JSONB;
BEGIN
  FOR offer_record IN 
    SELECT id, equipment_description 
    FROM public.offers 
    WHERE equipment_description IS NOT NULL
  LOOP
    BEGIN
      -- Try to parse equipment_description as JSON
      equipment_data := equipment_description::jsonb FROM public.offers WHERE id = offer_record.id;
      
      -- Check if it contains margin information
      IF equipment_data ? 'marginDifference' OR equipment_data ? 'totalMarginWithDifference' THEN
        -- Update the offer with extracted margin data
        UPDATE public.offers
        SET 
          margin_difference = COALESCE((equipment_data->>'marginDifference')::numeric, 0),
          total_margin_with_difference = COALESCE((equipment_data->>'totalMarginWithDifference')::numeric, 0)
        WHERE id = offer_record.id;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- If parsing fails, try different format
        BEGIN
          equipment_data := ('{"items":' || equipment_description || '}')::jsonb 
          FROM public.offers WHERE id = offer_record.id;
          
          IF equipment_data->'items' ? 'marginDifference' OR equipment_data->'items' ? 'totalMarginWithDifference' THEN
            UPDATE public.offers
            SET 
              margin_difference = COALESCE((equipment_data->'items'->>'marginDifference')::numeric, 0),
              total_margin_with_difference = COALESCE((equipment_data->'items'->>'totalMarginWithDifference')::numeric, 0)
            WHERE id = offer_record.id;
          END IF;
        EXCEPTION
          WHEN OTHERS THEN
            -- Ignore errors for this offer
            RAISE NOTICE 'Could not process equipment_description for offer %', offer_record.id;
        END;
    END;
  END LOOP;
END;
$function$;

-- 8. Fonction check_bucket_exists - correction SET search_path
CREATE OR REPLACE FUNCTION public.check_bucket_exists(bucket_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = storage
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = bucket_name
  );
END;
$function$;

-- 9. Fonction create_storage_bucket - correction SET search_path
CREATE OR REPLACE FUNCTION public.create_storage_bucket(bucket_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = storage
AS $function$
BEGIN
  -- Créer le bucket s'il n'existe pas
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = bucket_name) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES (bucket_name, bucket_name, true);
  END IF;
  
  -- Créer les politiques d'accès public
  INSERT INTO storage.policies (name, definition, bucket_id, operations)
  VALUES (
    bucket_name || '_public_select',
    'TRUE',
    bucket_name,
    '{SELECT}'
  ) ON CONFLICT (name, bucket_id) DO NOTHING;
  
  INSERT INTO storage.policies (name, definition, bucket_id, operations)
  VALUES (
    bucket_name || '_public_insert',
    'TRUE',
    bucket_name,
    '{INSERT}'
  ) ON CONFLICT (name, bucket_id) DO NOTHING;
  
  INSERT INTO storage.policies (name, definition, bucket_id, operations)
  VALUES (
    bucket_name || '_public_update',
    'TRUE',
    bucket_name,
    '{UPDATE}'
  ) ON CONFLICT (name, bucket_id) DO NOTHING;
  
  INSERT INTO storage.policies (name, definition, bucket_id, operations)
  VALUES (
    bucket_name || '_public_delete',
    'TRUE',
    bucket_name,
    '{DELETE}'
  ) ON CONFLICT (name, bucket_id) DO NOTHING;
END;
$function$;

-- 10. Fonction create_storage_policy - correction SET search_path
CREATE OR REPLACE FUNCTION public.create_storage_policy(bucket_name text, policy_name text, definition text, policy_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = storage
AS $function$
BEGIN
  -- Convertir le type de politique en tableau d'opérations
  -- policy_type peut être 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
  INSERT INTO storage.policies (name, definition, bucket_id, operations)
  VALUES (
    policy_name,
    definition,
    bucket_name,
    ARRAY[policy_type]::text[]
  ) ON CONFLICT (name, bucket_id) DO NOTHING;
END;
$function$;

-- 11. Fonction get_offer_by_id_public - correction SET search_path
CREATE OR REPLACE FUNCTION public.get_offer_by_id_public(offer_id uuid)
 RETURNS SETOF offers
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT * FROM public.offers WHERE id = offer_id LIMIT 1;
$function$;

-- 12. Fonction handle_new_user - correction SET search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
AS $function$
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
$function$;

-- 13. Fonction get_current_user_role - correction SET search_path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT role 
  FROM public.profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$function$;