-- =============================================
-- CORRECTION DE LA RÉCURSION INFINIE RLS PROFILES
-- =============================================

-- Étape 1: Supprimer toutes les politiques problématiques sur profiles
DROP POLICY IF EXISTS "Profiles strict isolation" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Company admins can view company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Company admins can manage company profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_can_view_profile_names" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_company_read" ON public.profiles;

-- Étape 2: Créer une fonction SECURITY DEFINER pour éviter la récursion
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS TABLE(
  user_id uuid,
  company_id uuid,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.company_id,
    p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
END;
$$;

-- Étape 3: Créer des politiques RLS sûres sans récursion
CREATE POLICY "profiles_own_access" 
ON public.profiles 
FOR ALL 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Politique pour les admins utilisant la fonction sécurisée
CREATE POLICY "profiles_admin_access" 
ON public.profiles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.get_current_user_profile() p
    WHERE p.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.get_current_user_profile() p
    WHERE p.role IN ('admin', 'super_admin')
  )
);

-- Politique pour l'isolation par entreprise (lecture seule pour les collègues)
CREATE POLICY "profiles_company_read" 
ON public.profiles 
FOR SELECT 
USING (
  company_id IN (
    SELECT p.company_id FROM public.get_current_user_profile() p
  ) 
  OR 
  EXISTS (
    SELECT 1 FROM public.get_current_user_profile() p
    WHERE p.role IN ('admin', 'super_admin')
  )
);

-- Mettre à jour la fonction get_user_company_id pour utiliser la nouvelle fonction
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT company_id FROM public.get_current_user_profile() LIMIT 1;
$$;