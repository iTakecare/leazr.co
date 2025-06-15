-- Transformer admin_pending_requests de vue en table avec RLS

-- 1. Supprimer l'ancienne vue
DROP VIEW IF EXISTS public.admin_pending_requests;

-- 2. Créer la nouvelle table
CREATE TABLE public.admin_pending_requests (
  id uuid,
  user_id uuid,
  client_id uuid,
  client_name text,
  client_email text,
  client_contact_email text,
  client_company text,
  amount numeric,
  coefficient numeric,
  monthly_payment numeric,
  commission numeric,
  equipment_description text,
  status text,
  workflow_status text,
  converted_to_contract boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);

-- 3. Activer RLS sur la nouvelle table
ALTER TABLE public.admin_pending_requests ENABLE ROW LEVEL SECURITY;

-- 4. Créer la politique RLS
CREATE POLICY "admin_pending_requests_admin_only" ON public.admin_pending_requests
FOR ALL USING (public.is_admin());

-- 5. Créer une fonction pour synchroniser les données
CREATE OR REPLACE FUNCTION public.refresh_admin_pending_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vider la table
  DELETE FROM public.admin_pending_requests;
  
  -- Insérer les données actuelles depuis les offres
  INSERT INTO public.admin_pending_requests (
    id, user_id, client_id, client_name, client_email, client_contact_email,
    client_company, amount, coefficient, monthly_payment, commission,
    equipment_description, status, workflow_status, converted_to_contract,
    created_at, updated_at
  )
  SELECT 
    o.id,
    o.user_id,
    o.client_id,
    o.client_name,
    o.client_email,
    c.email as client_contact_email,
    c.company as client_company,
    o.amount,
    o.coefficient,
    o.monthly_payment,
    o.commission,
    o.equipment_description,
    o.status,
    o.workflow_status,
    o.converted_to_contract,
    o.created_at,
    o.updated_at
  FROM public.offers o
  LEFT JOIN public.clients c ON o.client_id = c.id
  WHERE o.status IN ('pending', 'sent', 'approved')
  AND o.workflow_status IS NOT NULL;
END;
$$;

-- 6. Remplir la table avec les données actuelles
SELECT public.refresh_admin_pending_requests();

-- 7. Créer des triggers pour maintenir la synchronisation
CREATE OR REPLACE FUNCTION public.trigger_refresh_admin_pending_requests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.refresh_admin_pending_requests();
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers sur la table offers
CREATE TRIGGER refresh_admin_pending_requests_on_offers
  AFTER INSERT OR UPDATE OR DELETE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_refresh_admin_pending_requests();

-- Triggers sur la table clients
CREATE TRIGGER refresh_admin_pending_requests_on_clients
  AFTER UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_refresh_admin_pending_requests();