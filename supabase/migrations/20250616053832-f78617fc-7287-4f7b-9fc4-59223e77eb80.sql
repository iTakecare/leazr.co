
-- Corriger la fonction qui cause l'erreur DELETE
DROP FUNCTION IF EXISTS public.refresh_admin_pending_requests();

CREATE OR REPLACE FUNCTION public.refresh_admin_pending_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Vider la table avec une clause WHERE qui sélectionne tout
  DELETE FROM public.admin_pending_requests WHERE id IS NOT NULL OR id IS NULL;
  
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
