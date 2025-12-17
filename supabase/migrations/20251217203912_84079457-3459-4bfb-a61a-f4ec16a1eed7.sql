-- Ajouter les colonnes manquantes pour les informations complètes de l'entreprise
ALTER TABLE company_customizations 
ADD COLUMN IF NOT EXISTS company_postal_code TEXT,
ADD COLUMN IF NOT EXISTS company_city TEXT,
ADD COLUMN IF NOT EXISTS company_country TEXT DEFAULT 'Belgique',
ADD COLUMN IF NOT EXISTS company_bce TEXT,
ADD COLUMN IF NOT EXISTS company_legal_form TEXT;