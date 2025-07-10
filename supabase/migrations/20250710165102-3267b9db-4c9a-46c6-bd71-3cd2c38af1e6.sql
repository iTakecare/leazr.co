-- Corriger toutes les fonctions SECURITY DEFINER restantes qui manquent SET search_path TO 'public'

-- 1. Corriger is_admin_optimized
CREATE OR REPLACE FUNCTION public.is_admin_optimized()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
$$;

-- 2. Corriger refresh_admin_pending_requests
CREATE OR REPLACE FUNCTION public.refresh_admin_pending_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Vider la table avec une clause WHERE qui sélectionne tout
  DELETE FROM public.admin_pending_requests WHERE id IS NOT NULL OR id IS NULL;
  
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
$$;

-- 3. Corriger trigger_refresh_admin_pending_requests
CREATE OR REPLACE FUNCTION public.trigger_refresh_admin_pending_requests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM refresh_admin_pending_requests();
  RETURN NULL;
END;
$$;

-- 4. Corriger update_offer_margins
CREATE OR REPLACE FUNCTION public.update_offer_margins()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.offers 
  SET margin = CASE 
    WHEN equipment_description ILIKE '%ordinateur%' OR equipment_description ILIKE '%laptop%' OR equipment_description ILIKE '%pc%' THEN 150
    WHEN equipment_description ILIKE '%imprimante%' OR equipment_description ILIKE '%printer%' THEN 75
    WHEN equipment_description ILIKE '%téléphone%' OR equipment_description ILIKE '%phone%' OR equipment_description ILIKE '%mobile%' THEN 100
    WHEN equipment_description ILIKE '%tablette%' OR equipment_description ILIKE '%tablet%' OR equipment_description ILIKE '%ipad%' THEN 120
    WHEN equipment_description ILIKE '%écran%' OR equipment_description ILIKE '%monitor%' OR equipment_description ILIKE '%display%' THEN 80
    WHEN equipment_description ILIKE '%serveur%' OR equipment_description ILIKE '%server%' THEN 200
    WHEN equipment_description ILIKE '%switch%' OR equipment_description ILIKE '%routeur%' OR equipment_description ILIKE '%router%' THEN 90
    WHEN equipment_description ILIKE '%caméra%' OR equipment_description ILIKE '%camera%' THEN 110
    ELSE 100
  END
  WHERE margin IS NULL OR margin = 0;
END;
$$;

-- 5. Corriger check_bucket_exists
CREATE OR REPLACE FUNCTION public.check_bucket_exists(bucket_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM storage.buckets 
    WHERE id = bucket_name
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- 6. Corriger create_storage_bucket
CREATE OR REPLACE FUNCTION public.create_storage_bucket(bucket_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Créer le bucket s'il n'existe pas
  IF NOT check_bucket_exists(bucket_name) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES (bucket_name, bucket_name, true);
  END IF;
  
  -- Créer les politiques de base
  PERFORM create_storage_policy(
    bucket_name, 
    'Public read access', 
    'true', 
    'SELECT'
  );
  
  PERFORM create_storage_policy(
    bucket_name, 
    'Authenticated users can upload', 
    'auth.uid() IS NOT NULL', 
    'INSERT'
  );
END;
$$;

-- 7. Corriger create_storage_policy
CREATE OR REPLACE FUNCTION public.create_storage_policy(bucket_name text, policy_name text, definition text, policy_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  full_policy_name text;
BEGIN
  full_policy_name := bucket_name || '_' || lower(replace(policy_name, ' ', '_'));
  
  EXECUTE format(
    'CREATE POLICY %I ON storage.objects FOR %s USING (bucket_id = %L AND (%s))',
    full_policy_name,
    policy_type,
    bucket_name,
    definition
  );
EXCEPTION
  WHEN duplicate_object THEN
    -- La politique existe déjà, ignorer l'erreur
    NULL;
  WHEN OTHERS THEN
    -- Log l'erreur mais continuer
    RAISE NOTICE 'Erreur lors de la création de la politique %: %', full_policy_name, SQLERRM;
END;
$$;

-- 8. Corriger get_offer_by_id_public
CREATE OR REPLACE FUNCTION public.get_offer_by_id_public(offer_id uuid)
RETURNS SETOF offers
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.offers WHERE id = offer_id;
$$;