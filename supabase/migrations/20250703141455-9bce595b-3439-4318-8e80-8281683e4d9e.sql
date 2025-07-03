-- Ajouter les colonnes d'adresse complète à la table leasers
ALTER TABLE public.leasers 
ADD COLUMN address TEXT,
ADD COLUMN city TEXT,
ADD COLUMN postal_code TEXT,
ADD COLUMN country TEXT,
ADD COLUMN vat_number TEXT,
ADD COLUMN phone TEXT,
ADD COLUMN email TEXT;