-- Correction des warnings "Function Search Path Mutable" du Security Advisor
-- Ajouter SET search_path = 'public' à toutes les fonctions concernées pour éviter les risques de sécurité

-- 1. get_current_user_email (SECURITY DEFINER - Critique)
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_email TEXT;
  current_user_id UUID;
BEGIN
  -- Récupérer l'ID utilisateur actuel
  current_user_id := auth.uid();
  
  -- Si pas d'utilisateur authentifié, retourner null
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Récupérer l'email de l'utilisateur
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = current_user_id;
  
  RETURN user_email;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, retourner null au lieu de faire échouer
    RETURN NULL;
END;
$$;

-- 2. trigger_initialize_company (SECURITY DEFINER - Critique)
CREATE OR REPLACE FUNCTION public.trigger_initialize_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Initialiser la nouvelle entreprise après sa création
  PERFORM public.initialize_new_company(NEW.id, NEW.name);
  RETURN NEW;
END;
$$;

-- 3. update_company_customizations_updated_at (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.update_company_customizations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4. update_chat_updated_at (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.update_chat_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 5. update_prospects_updated_at (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.update_prospects_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 6. update_updated_at_column (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;