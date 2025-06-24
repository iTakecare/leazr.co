
-- Supprimer la politique problématique qui cause la récursion infinie
DROP POLICY IF EXISTS "users_can_view_profile_names" ON profiles;

-- Créer une fonction SECURITY DEFINER pour éviter la récursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role 
  FROM public.profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Créer une fonction pour vérifier si l'utilisateur est admin/ambassadeur
CREATE OR REPLACE FUNCTION public.is_admin_or_ambassador()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'ambassador')
  );
$$;

-- Recréer la politique pour les profils sans récursion
CREATE POLICY "users_can_view_profile_names" ON profiles
FOR SELECT USING (
  -- L'utilisateur peut voir son propre profil
  auth.uid() = id 
  OR 
  -- Les admins et ambassadeurs peuvent voir les autres profils
  public.is_admin_or_ambassador()
);
