-- Étendre la table company_customizations pour inclure toutes les informations d'entreprise
ALTER TABLE public.company_customizations 
ADD COLUMN IF NOT EXISTS company_address TEXT,
ADD COLUMN IF NOT EXISTS company_phone TEXT,
ADD COLUMN IF NOT EXISTS company_email TEXT;

-- Ajouter un commentaire pour documenter la structure
COMMENT ON TABLE public.company_customizations IS 'Stockage des paramètres et informations personnalisées par entreprise pour une isolation complète des données';