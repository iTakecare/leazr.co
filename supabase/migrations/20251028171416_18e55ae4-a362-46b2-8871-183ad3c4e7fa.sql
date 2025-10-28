-- Migration Partie 2 : Fonctions RPC pour les brokers
-- Fonction pour vérifier si l'utilisateur est un broker
CREATE OR REPLACE FUNCTION public.is_broker()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT has_role(auth.uid(), 'broker'::app_role);
$$;

-- Fonction pour récupérer le broker_id (company_id) de l'utilisateur
CREATE OR REPLACE FUNCTION public.get_user_broker_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_company_id UUID;
  user_company_type TEXT;
BEGIN
  -- Récupérer le company_id et company_type depuis profiles
  SELECT p.company_id, c.company_type INTO user_company_id, user_company_type
  FROM public.profiles p
  JOIN public.companies c ON p.company_id = c.id
  WHERE p.id = auth.uid()
  LIMIT 1;
  
  -- Vérifier que c'est bien un broker
  IF user_company_type = 'broker' THEN
    RETURN user_company_id;
  ELSE
    RETURN NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$function$;

-- Fonction pour récupérer les infos d'un broker par slug
CREATE OR REPLACE FUNCTION public.get_broker_by_slug(broker_slug text)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  logo_url text,
  primary_color text,
  secondary_color text,
  accent_color text,
  modules_enabled text[],
  company_type text,
  is_active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.slug,
    c.logo_url,
    c.primary_color,
    c.secondary_color,
    c.accent_color,
    c.modules_enabled,
    c.company_type,
    c.is_active,
    c.created_at,
    c.updated_at
  FROM public.companies c
  WHERE c.slug = broker_slug
    AND c.company_type = 'broker'
    AND c.is_active = true
  LIMIT 1;
END;
$function$;