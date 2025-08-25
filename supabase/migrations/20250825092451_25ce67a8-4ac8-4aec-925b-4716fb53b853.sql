-- FINAL SECURITY FIX: Complete all database functions with immutable search paths
-- This addresses the remaining "Function Search Path Mutable" security warning

-- Fix all remaining functions to have immutable search paths
-- This prevents function hijacking attacks completely

-- Update get_user_company_id (the main function used in RLS)
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'  -- FIXED: Immutable search path
AS $$
DECLARE
    user_company_id uuid;
BEGIN
    -- Get company_id from profiles table for current user
    SELECT company_id INTO user_company_id
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1;
    
    RETURN user_company_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;

-- Update is_admin_optimized function
CREATE OR REPLACE FUNCTION public.is_admin_optimized()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'  -- FIXED: Immutable search path
AS $$
DECLARE
    user_role text;
    user_email text;
BEGIN
    -- Check if user is SaaS admin first (fastest check)
    SELECT email INTO user_email 
    FROM auth.users 
    WHERE id = auth.uid();
    
    IF user_email = 'ecommerce@itakecare.be' THEN
        RETURN true;
    END IF;
    
    -- Then check profile role
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1;
    
    RETURN user_role IN ('admin', 'super_admin');
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

-- Update is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'  -- FIXED: Immutable search path
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN user_role IN ('admin', 'super_admin');
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

-- Update other critical functions with search paths
CREATE OR REPLACE FUNCTION public.generate_company_subdomain(company_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'  -- FIXED: Immutable search path
AS $$
DECLARE
  base_subdomain text;
  final_subdomain text;
  counter integer := 1;
BEGIN
  -- Nettoyer le nom de l'entreprise pour créer un sous-domaine valide
  base_subdomain := lower(regexp_replace(company_name, '[^a-zA-Z0-9]', '', 'g'));
  
  -- Limiter à 20 caractères maximum
  base_subdomain := left(base_subdomain, 20);
  
  -- Si le nom est vide après nettoyage, utiliser un nom par défaut
  IF base_subdomain = '' OR base_subdomain IS NULL THEN
    base_subdomain := 'company';
  END IF;
  
  -- Vérifier l'unicité et ajouter un numéro si nécessaire
  final_subdomain := base_subdomain;
  
  WHILE EXISTS (SELECT 1 FROM public.company_domains WHERE subdomain = final_subdomain) LOOP
    final_subdomain := base_subdomain || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_subdomain;
END;
$$;

-- Update detect_company_from_domain function
CREATE OR REPLACE FUNCTION public.detect_company_from_domain(request_origin text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'  -- FIXED: Immutable search path
AS $$
DECLARE
  company_uuid UUID;
  extracted_subdomain TEXT;
BEGIN
  -- Extraire le sous-domaine depuis l'origine de la requête
  -- Ex: https://client1.leazr.co -> client1
  IF request_origin LIKE '%.leazr.co%' THEN
    extracted_subdomain := SPLIT_PART(SPLIT_PART(request_origin, '//', 2), '.', 1);
    
    -- Chercher dans la table company_domains
    SELECT company_id INTO company_uuid
    FROM public.company_domains
    WHERE subdomain = extracted_subdomain AND is_active = true
    LIMIT 1;
  END IF;
  
  -- Si pas trouvé, retourner NULL (utilisation du domaine principal)
  RETURN company_uuid;
END;
$$;