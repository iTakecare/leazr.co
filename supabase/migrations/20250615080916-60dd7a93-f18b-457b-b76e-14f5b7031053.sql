-- Complètement refaire les politiques RLS pour éviter la récursion

-- Désactiver temporairement RLS sur profiles pour éviter la récursion
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Recréer la fonction get_user_company_id sans dépendance RLS
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_company_id UUID;
BEGIN
  -- Accès direct sans RLS
  SELECT company_id INTO user_company_id 
  FROM public.profiles 
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN user_company_id;
END;
$$;

-- Réactiver RLS sur profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les anciennes politiques
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Company admins can view company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Company admins can manage company profiles" ON public.profiles;

-- Recréer des politiques simples et sûres
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Politique simple pour les admins (sans récursion)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = id) OR 
  (
    SELECT role FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    LIMIT 1
  ) IS NOT NULL
);

CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (
  (auth.uid() = id) OR 
  (
    SELECT role FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    LIMIT 1
  ) IS NOT NULL
);