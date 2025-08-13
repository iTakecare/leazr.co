-- Ajouter les champs d'adresses de facturation et de livraison à la table clients
ALTER TABLE public.clients 
ADD COLUMN billing_address text,
ADD COLUMN billing_city text,
ADD COLUMN billing_postal_code text,
ADD COLUMN billing_country text,
ADD COLUMN delivery_address text,
ADD COLUMN delivery_city text,
ADD COLUMN delivery_postal_code text,
ADD COLUMN delivery_country text,
ADD COLUMN delivery_same_as_billing boolean DEFAULT true;

-- Migrer les données existantes vers les champs de facturation
UPDATE public.clients 
SET 
  billing_address = address,
  billing_city = city,
  billing_postal_code = postal_code,
  billing_country = country,
  delivery_address = address,
  delivery_city = city,
  delivery_postal_code = postal_code,
  delivery_country = country
WHERE address IS NOT NULL OR city IS NOT NULL OR postal_code IS NOT NULL OR country IS NOT NULL;

-- Commentaire pour documenter la migration
COMMENT ON COLUMN public.clients.billing_address IS 'Adresse de facturation du client';
COMMENT ON COLUMN public.clients.delivery_address IS 'Adresse de livraison du client';
COMMENT ON COLUMN public.clients.delivery_same_as_billing IS 'Indique si l''adresse de livraison est identique à celle de facturation';