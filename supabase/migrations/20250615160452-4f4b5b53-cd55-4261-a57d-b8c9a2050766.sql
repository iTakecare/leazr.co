-- Corriger la fonction is_admin_optimized pour éviter l'accès à la table users
CREATE OR REPLACE FUNCTION public.is_admin_optimized()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
$$;