-- Corriger les warnings restants du Security Advisor

-- 16. Fonction mark_clients_as_duplicates
CREATE OR REPLACE FUNCTION public.mark_clients_as_duplicates(client_ids uuid[], main_client_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE public.clients
  SET 
    status = 'duplicate',
    notes = COALESCE(notes, '') || E'\n' || 'Marqué comme doublon le ' || NOW()::text || '. ID du client principal: ' || main_client_id::text
  WHERE id = ANY($1);
  
  RETURN FOUND;
END;
$function$;

-- 17. Fonction check_function_exists
CREATE OR REPLACE FUNCTION public.check_function_exists(function_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_catalog
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = function_name
  );
END;
$function$;

-- 18. Fonction calculate_total_revenue
CREATE OR REPLACE FUNCTION public.calculate_total_revenue(time_filter text)
 RETURNS TABLE(total_revenue numeric, gross_margin numeric, clients_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  time_constraint text;
BEGIN
  CASE time_filter
    WHEN 'month' THEN time_constraint := 'created_at >= date_trunc(''month'', now())';
    WHEN 'quarter' THEN time_constraint := 'created_at >= date_trunc(''quarter'', now())';
    WHEN 'year' THEN time_constraint := 'created_at >= date_trunc(''year'', now())';
    ELSE time_constraint := 'TRUE';
  END CASE;

  RETURN QUERY EXECUTE '
    WITH revenue AS (
      SELECT COALESCE(SUM(monthly_payment), 0) AS total_revenue
      FROM contracts
      WHERE ' || time_constraint || '
    ),
    margin AS (
      SELECT COALESCE(SUM(commission), 0) AS gross_margin
      FROM offers
      WHERE status = ''accepted'' AND ' || time_constraint || '
    ),
    clients AS (
      SELECT COUNT(*) AS clients_count
      FROM clients
    )
    SELECT revenue.total_revenue, margin.gross_margin, clients.clients_count
    FROM revenue, margin, clients';
END;
$function$;

-- 19. Fonction get_user_profile_with_associations
CREATE OR REPLACE FUNCTION public.get_user_profile_with_associations(user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  profile_data RECORD;
  partner_id UUID;
  ambassador_id UUID;
  client_id UUID;
  result JSON;
BEGIN
  SELECT first_name, last_name, company, role INTO profile_data
  FROM public.profiles
  WHERE id = user_id;
  
  SELECT id INTO partner_id
  FROM public.partners
  WHERE user_id = get_user_profile_with_associations.user_id
  LIMIT 1;
  
  SELECT id INTO ambassador_id
  FROM public.ambassadors
  WHERE user_id = get_user_profile_with_associations.user_id
  LIMIT 1;
  
  SELECT id INTO client_id
  FROM public.clients
  WHERE user_id = get_user_profile_with_associations.user_id
  LIMIT 1;
  
  result := json_build_object(
    'first_name', COALESCE(profile_data.first_name, ''),
    'last_name', COALESCE(profile_data.last_name, ''),
    'company', COALESCE(profile_data.company, ''),
    'role', COALESCE(profile_data.role, 'client'),
    'partner_id', partner_id,
    'ambassador_id', ambassador_id,
    'client_id', client_id
  );
  
  RETURN result;
END;
$function$;

-- 20. Fonction ensure_site_settings_bucket
CREATE OR REPLACE FUNCTION public.ensure_site_settings_bucket()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, storage
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'site-settings') THEN
    RETURN true;
  END IF;
  
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('site-settings', 'Site Settings', true);
  
  INSERT INTO storage.policies (name, definition, bucket_id, operations)
  VALUES ('Public Access', 'true', 'site-settings', '{SELECT}');
  
  INSERT INTO storage.policies (name, definition, bucket_id, operations)
  VALUES ('Admin Upload', '((SELECT role FROM public.profiles WHERE id = auth.uid()) = ''admin'')', 'site-settings', '{INSERT, UPDATE, DELETE}');
  
  RETURN true;
EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$function$;

-- 21. Fonction check_table_exists
CREATE OR REPLACE FUNCTION public.check_table_exists(table_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, information_schema
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = $1
  );
END;
$function$;

-- 22. Fonction create_categories_table
CREATE OR REPLACE FUNCTION public.create_categories_table()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, information_schema
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'categories'
  ) THEN
    CREATE TABLE public.categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      translation TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
    );
    
    INSERT INTO public.categories (name, translation)
    VALUES 
      ('laptop', 'Ordinateur portable'),
      ('desktop', 'Ordinateur de bureau'),
      ('tablet', 'Tablette'),
      ('smartphone', 'Smartphone'),
      ('accessories', 'Accessoires'),
      ('printer', 'Imprimante'),
      ('monitor', 'Écran'),
      ('software', 'Logiciel'),
      ('networking', 'Réseau'),
      ('server', 'Serveur'),
      ('storage', 'Stockage'),
      ('other', 'Autre');
  END IF;
END;
$function$;

-- 23. Fonction create_client_as_ambassador
CREATE OR REPLACE FUNCTION public.create_client_as_ambassador(client_data jsonb, ambassador_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  new_client_id UUID;
BEGIN
  INSERT INTO public.clients (
    name, email, company, phone, address, notes, status, vat_number, city, postal_code, country
  )
  VALUES (
    client_data->>'name', client_data->>'email', client_data->>'company', client_data->>'phone',
    client_data->>'address', client_data->>'notes', COALESCE(client_data->>'status', 'active'),
    client_data->>'vat_number', client_data->>'city', client_data->>'postal_code', client_data->>'country'
  )
  RETURNING id INTO new_client_id;

  INSERT INTO public.ambassador_clients (ambassador_id, client_id)
  VALUES (ambassador_id, new_client_id);

  RETURN new_client_id;
END;
$function$;

-- 24. Fonction update_client_securely
CREATE OR REPLACE FUNCTION public.update_client_securely(p_client_id uuid, p_updates jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE public.clients
  SET 
    name = COALESCE(p_updates->>'name', name),
    email = COALESCE(p_updates->>'email', email),
    company = COALESCE(p_updates->>'company', company),
    phone = COALESCE(p_updates->>'phone', phone),
    address = COALESCE(p_updates->>'address', address),
    city = COALESCE(p_updates->>'city', city),
    postal_code = COALESCE(p_updates->>'postal_code', postal_code),
    country = COALESCE(p_updates->>'country', country),
    vat_number = COALESCE(p_updates->>'vat_number', vat_number),
    notes = COALESCE(p_updates->>'notes', notes),
    status = COALESCE(p_updates->>'status', status),
    updated_at = NOW()
  WHERE id = p_client_id;
  
  RETURN FOUND;
END;
$function$;

-- 25. Fonction create_company_with_admin
CREATE OR REPLACE FUNCTION public.create_company_with_admin(company_name text, admin_email text, admin_password text, admin_first_name text, admin_last_name text, plan_type text DEFAULT 'starter'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
AS $function$
DECLARE
  new_company_id UUID;
  new_user_id UUID;
BEGIN
  INSERT INTO public.companies (name, plan)
  VALUES (company_name, plan_type)
  RETURNING id INTO new_company_id;
  
  INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES (
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    now(),
    jsonb_build_object('first_name', admin_first_name, 'last_name', admin_last_name, 'role', 'admin')
  )
  RETURNING id INTO new_user_id;
  
  INSERT INTO public.profiles (id, first_name, last_name, role, company_id)
  VALUES (new_user_id, admin_first_name, admin_last_name, 'admin', new_company_id);
  
  RETURN new_company_id;
END;
$function$;