
-- Supprimer les politiques existantes sur la table clients
DROP POLICY IF EXISTS "client_access" ON public.clients;

-- Créer une nouvelle politique permettant aux administrateurs d'accéder à tous les clients
CREATE POLICY "admin_full_client_access" ON public.clients
FOR ALL USING (
  -- Les administrateurs peuvent voir tous les clients
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' IN ('admin', 'super_admin')
  )
  OR
  -- Les utilisateurs normaux ne peuvent voir que leurs propres données client
  user_id = auth.uid()
  OR
  -- Les clients de la même entreprise peuvent être vus
  company_id = get_user_company_id()
);

-- Corriger également la fonction getAllClients pour être sûr qu'elle fonctionne pour les admins
CREATE OR REPLACE FUNCTION public.get_all_clients_for_admin()
RETURNS SETOF clients
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.clients 
  ORDER BY created_at DESC;
$$;
