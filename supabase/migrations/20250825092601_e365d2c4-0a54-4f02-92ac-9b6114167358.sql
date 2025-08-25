-- COMPREHENSIVE FIX: Add immutable search path to ALL security definer functions
-- This will completely resolve the "Function Search Path Mutable" security warning

-- Get a list of all SECURITY DEFINER functions and fix them systematically
-- Based on the function list from supabase configuration, update all critical functions

-- 1. Update trigger and timestamp functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Update all client-related trigger functions
CREATE OR REPLACE FUNCTION public.update_client_delivery_sites_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_client_custom_prices_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_client_custom_variant_prices_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. Update company-related functions
CREATE OR REPLACE FUNCTION public.auto_generate_company_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Générer un slug automatiquement si pas fourni
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_company_slug(NEW.name);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_create_company_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  generated_subdomain text;
BEGIN
  -- Générer un sous-domaine unique
  generated_subdomain := public.generate_company_subdomain(NEW.name);
  
  -- Créer l'entrée dans company_domains
  INSERT INTO public.company_domains (
    company_id,
    domain,
    subdomain,
    is_active,
    is_primary
  ) VALUES (
    NEW.id,
    'leazr.co',
    generated_subdomain,
    true,
    true
  );
  
  RETURN NEW;
END;
$$;

-- 4. Update other important security functions
CREATE OR REPLACE FUNCTION public.can_manage_users()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
END;
$$;

-- 5. Update validation functions
CREATE OR REPLACE FUNCTION public.validate_delivery_quantities()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_equipment_quantity INTEGER;
  total_delivery_quantity INTEGER;
BEGIN
  -- Get the total quantity from the parent equipment
  SELECT quantity INTO total_equipment_quantity
  FROM contract_equipment
  WHERE id = COALESCE(NEW.contract_equipment_id, OLD.contract_equipment_id);
  
  -- Get the sum of all delivery quantities for this equipment
  SELECT COALESCE(SUM(quantity), 0) INTO total_delivery_quantity
  FROM contract_equipment_deliveries
  WHERE contract_equipment_id = COALESCE(NEW.contract_equipment_id, OLD.contract_equipment_id)
    AND id != COALESCE(NEW.id, OLD.id);
  
  -- Add the current row quantity if it's an INSERT or UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    total_delivery_quantity := total_delivery_quantity + NEW.quantity;
  END IF;
  
  -- Check that we don't exceed the total equipment quantity
  IF total_delivery_quantity > total_equipment_quantity THEN
    RAISE EXCEPTION 'Total delivery quantities (%) cannot exceed equipment quantity (%)', 
      total_delivery_quantity, total_equipment_quantity;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6. Update utility and helper functions
CREATE OR REPLACE FUNCTION public.check_function_exists(function_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = function_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = $1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_bucket_exists(bucket_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = bucket_name
  );
END;
$$;