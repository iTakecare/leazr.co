
-- Ajouter une politique RLS pour permettre l'accès public aux offres envoyées ou approuvées
-- Cela permet aux clients d'accéder à leurs offres via le lien de signature sans être connectés

-- Supprimer l'ancienne politique si elle existe
DROP POLICY IF EXISTS "Public can view signed offers" ON public.offers;

-- Créer une nouvelle politique plus permissive pour l'accès public aux offres
CREATE POLICY "Public access to sent and approved offers"
ON public.offers
FOR SELECT
USING (
  workflow_status IN ('sent', 'approved') 
  OR status IN ('sent', 'approved')
);

-- Améliorer la fonction RPC pour récupérer une offre publique
CREATE OR REPLACE FUNCTION public.get_offer_by_id_public(offer_id uuid)
RETURNS TABLE(
  id uuid,
  client_name text,
  client_email text,
  client_id uuid,
  equipment_description text,
  amount numeric,
  monthly_payment numeric,
  coefficient numeric,
  workflow_status text,
  signature_data text,
  signer_name text,
  signed_at timestamp with time zone,
  signer_ip text,
  remarks text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log de la tentative d'accès
  RAISE NOTICE 'Tentative d''accès à l''offre publique: %', offer_id;
  
  RETURN QUERY
  SELECT 
    o.id,
    o.client_name,
    o.client_email,
    o.client_id,
    o.equipment_description,
    o.amount,
    o.monthly_payment,
    o.coefficient,
    o.workflow_status,
    o.signature_data,
    o.signer_name,
    o.signed_at,
    o.signer_ip,
    o.remarks,
    o.created_at
  FROM public.offers o
  WHERE o.id = offer_id
    AND (o.workflow_status IN ('sent', 'approved') OR o.status IN ('sent', 'approved'))
  LIMIT 1;
  
  -- Log du résultat
  IF NOT FOUND THEN
    RAISE NOTICE 'Aucune offre publique trouvée pour l''ID: %', offer_id;
  ELSE
    RAISE NOTICE 'Offre publique trouvée et retournée pour l''ID: %', offer_id;
  END IF;
END;
$$;
