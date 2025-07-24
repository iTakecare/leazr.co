-- Corriger toutes les fonctions SECURITY DEFINER qui n'ont pas search_path défini

-- Fonction is_admin_optimized
CREATE OR REPLACE FUNCTION public.is_admin_optimized()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
$$;

-- Fonction get_current_user_role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role 
  FROM public.profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Fonction get_current_user_email
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT 
LANGUAGE plpgsql 
STABLE SECURITY DEFINER 
SET search_path = ''
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