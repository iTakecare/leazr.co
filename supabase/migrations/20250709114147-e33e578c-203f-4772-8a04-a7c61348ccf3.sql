
-- Phase 1: Extension de la table prospects avec tous les champs clients
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS vat_number text,
ADD COLUMN IF NOT EXISTS shipping_address text,
ADD COLUMN IF NOT EXISTS shipping_city text,
ADD COLUMN IF NOT EXISTS shipping_postal_code text,
ADD COLUMN IF NOT EXISTS shipping_country text,
ADD COLUMN IF NOT EXISTS has_different_shipping_address boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS contact_name text,
ADD COLUMN IF NOT EXISTS is_ambassador_client boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS notes text;

-- Phase 2: Renommer company_name en company pour cohérence
ALTER TABLE public.prospects 
RENAME COLUMN company_name TO company;

-- Phase 3: Migrer les données existantes des clients vers prospects
-- Identifier les clients qui correspondent à des prospects actifs
WITH client_prospect_mapping AS (
  SELECT 
    c.id as client_id,
    p.id as prospect_id,
    c.phone,
    c.address,
    c.city,
    c.postal_code,
    c.country,
    c.vat_number,
    c.shipping_address,
    c.shipping_city,
    c.shipping_postal_code,
    c.shipping_country,
    c.has_different_shipping_address,
    c.contact_name,
    c.is_ambassador_client,
    c.notes
  FROM clients c
  INNER JOIN auth.users au ON c.user_id = au.id
  INNER JOIN prospects p ON p.email = au.email
  WHERE p.status IN ('active', 'converted')
)
UPDATE prospects 
SET 
  phone = cpm.phone,
  address = cpm.address,
  city = cpm.city,
  postal_code = cpm.postal_code,
  country = cpm.country,
  vat_number = cpm.vat_number,
  shipping_address = cpm.shipping_address,
  shipping_city = cpm.shipping_city,
  shipping_postal_code = cpm.shipping_postal_code,
  shipping_country = cpm.shipping_country,
  has_different_shipping_address = cpm.has_different_shipping_address,
  contact_name = cpm.contact_name,
  is_ambassador_client = cpm.is_ambassador_client,
  notes = cpm.notes,
  updated_at = now()
FROM client_prospect_mapping cpm
WHERE prospects.id = cpm.prospect_id;

-- Phase 4: Supprimer les clients qui correspondent à des prospects actifs
DELETE FROM clients 
WHERE user_id IN (
  SELECT au.id 
  FROM auth.users au
  INNER JOIN prospects p ON p.email = au.email
  WHERE p.status IN ('active', 'converted')
);

-- Phase 5: Supprimer les champs redondants de la table clients
-- Ces champs sont maintenant dans prospects pour les utilisateurs en essai
ALTER TABLE public.clients 
DROP COLUMN IF EXISTS shipping_address,
DROP COLUMN IF EXISTS shipping_city,
DROP COLUMN IF EXISTS shipping_postal_code,
DROP COLUMN IF EXISTS shipping_country,
DROP COLUMN IF EXISTS has_different_shipping_address,
DROP COLUMN IF EXISTS contact_name,
DROP COLUMN IF EXISTS is_ambassador_client;

-- Phase 6: Mettre à jour la fonction get_user_trial_status pour utiliser le nouveau nom de colonne
CREATE OR REPLACE FUNCTION public.get_user_trial_status()
 RETURNS TABLE(is_trial boolean, trial_ends_at timestamp with time zone, days_remaining integer, company_name text, prospect_email text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_email text;
  prospect_record record;
BEGIN
  -- Récupérer l'email de l'utilisateur actuel
  SELECT email INTO current_user_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- Chercher dans la table prospects avec statuts 'active' ET 'converted'
  SELECT p.*, p.trial_ends_at as prospect_trial_ends_at, p.company as company_name INTO prospect_record
  FROM prospects p
  WHERE p.email = current_user_email 
    AND p.status IN ('active', 'converted')
    AND p.trial_ends_at > now();
  
  IF FOUND THEN
    RETURN QUERY SELECT
      true as is_trial,
      prospect_record.prospect_trial_ends_at,
      GREATEST(0, EXTRACT(days FROM (prospect_record.prospect_trial_ends_at - now()))::integer) as days_remaining,
      prospect_record.company_name,
      prospect_record.email;
  ELSE
    RETURN QUERY SELECT
      false as is_trial,
      null::timestamp with time zone as trial_ends_at,
      0 as days_remaining,
      null::text as company_name,
      null::text as prospect_email;
  END IF;
END;
$function$;
