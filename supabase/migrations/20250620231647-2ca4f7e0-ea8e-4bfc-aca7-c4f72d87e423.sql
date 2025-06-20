
-- Supprimer les politiques existantes problématiques sur la table clients
DROP POLICY IF EXISTS "admin_full_client_access" ON public.clients;
DROP POLICY IF EXISTS "client_access" ON public.clients;

-- Créer une nouvelle politique plus permissive pour les administrateurs
CREATE POLICY "admin_and_user_client_access" ON public.clients
FOR ALL USING (
  -- Les super admins et admins peuvent voir tous les clients
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' IN ('admin', 'super_admin')
  )
  OR
  -- Les utilisateurs peuvent voir leurs propres clients
  user_id = auth.uid()
  OR
  -- Les clients de la même entreprise peuvent être vus
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
  OR
  -- Accès anonyme pour certaines opérations publiques
  auth.role() = 'anon'
);

-- Mettre à jour la fonction get_all_clients_for_admin pour être plus robuste
CREATE OR REPLACE FUNCTION public.get_all_clients_for_admin()
RETURNS SETOF clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Vérifier le rôle de l'utilisateur actuel
  SELECT raw_user_meta_data->>'role' INTO current_user_role 
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- Si l'utilisateur est admin ou super_admin, retourner tous les clients
  IF current_user_role IN ('admin', 'super_admin') THEN
    RETURN QUERY SELECT * FROM public.clients ORDER BY created_at DESC;
  ELSE
    -- Sinon, retourner seulement les clients associés à l'utilisateur
    RETURN QUERY 
    SELECT * FROM public.clients 
    WHERE user_id = auth.uid() 
    OR company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
    ORDER BY created_at DESC;
  END IF;
END;
$$;

-- Créer une fonction pour vérifier l'existence d'un utilisateur par ID
CREATE OR REPLACE FUNCTION public.check_user_exists_by_id(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE id = user_id
  );
END;
$$;
