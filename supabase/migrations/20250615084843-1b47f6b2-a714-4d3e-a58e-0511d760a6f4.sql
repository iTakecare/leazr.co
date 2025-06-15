-- Ajouter le champ téléphone à la table profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;