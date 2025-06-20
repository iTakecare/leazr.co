
-- Supprimer toutes les politiques existantes sur la table clients
DROP POLICY IF EXISTS "admin_and_user_client_access" ON public.clients;
DROP POLICY IF EXISTS "admin_full_client_access" ON public.clients;
DROP POLICY IF EXISTS "client_access" ON public.clients;

-- Créer une politique très permissive pour les utilisateurs authentifiés
CREATE POLICY "authenticated_users_full_access" ON public.clients
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Créer une politique pour les utilisateurs anonymes (lecture seule)
CREATE POLICY "anonymous_read_access" ON public.clients
FOR SELECT 
TO anon
USING (true);

-- Créer une fonction RPC pour contourner complètement les RLS si nécessaire
CREATE OR REPLACE FUNCTION public.get_client_by_id_bypass_rls(client_id uuid)
RETURNS SETOF clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.clients WHERE id = client_id LIMIT 1;
END;
$$;

-- Fonction pour obtenir tous les clients en contournant les RLS
CREATE OR REPLACE FUNCTION public.get_all_clients_bypass_rls()
RETURNS SETOF clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.clients ORDER BY created_at DESC;
END;
$$;

-- Fonction pour mettre à jour un client en contournant les RLS
CREATE OR REPLACE FUNCTION public.update_client_bypass_rls(p_client_id uuid, p_updates jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.clients
  SET 
    name = COALESCE(p_updates->>'name', name),
    email = COALESCE(p_updates->>'email', email),
    company = COALESCE(p_updates->>'company', company),
    phone = COALESCE(p_updates->>'phone', phone),
    address = COALESCE(p_updates->>'address', address),
    city = COALESCE(p_updates->>'city', city),
    postal_code = COALESCE(p_updates->>'postal_code', postal_code),
    country = COALESCE(p_updates->>'country', country),
    vat_number = COALESCE(p_updates->>'vat_number', vat_number),
    notes = COALESCE(p_updates->>'notes', notes),
    status = COALESCE(p_updates->>'status', status),
    contact_name = COALESCE(p_updates->>'contact_name', contact_name),
    shipping_address = COALESCE(p_updates->>'shipping_address', shipping_address),
    shipping_city = COALESCE(p_updates->>'shipping_city', shipping_city),
    shipping_postal_code = COALESCE(p_updates->>'shipping_postal_code', shipping_postal_code),
    shipping_country = COALESCE(p_updates->>'shipping_country', shipping_country),
    has_different_shipping_address = COALESCE((p_updates->>'has_different_shipping_address')::boolean, has_different_shipping_address),
    updated_at = NOW()
  WHERE id = p_client_id;
  
  RETURN FOUND;
END;
$$;
