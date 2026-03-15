
-- Séquence pour les numéros de dossier séquentiels
CREATE SEQUENCE IF NOT EXISTS public.offer_dossier_seq START WITH 9976;

-- Fonction RPC pour obtenir le prochain numéro de dossier formaté
CREATE OR REPLACE FUNCTION public.get_next_dossier_number()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'ITC-' || EXTRACT(YEAR FROM now())::text || '-OFF-' || nextval('public.offer_dossier_seq')::text
$$;
