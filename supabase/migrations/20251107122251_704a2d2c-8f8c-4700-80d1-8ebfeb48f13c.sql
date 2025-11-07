-- Phase 2: Amélioration du système PDF

-- 1. Ajouter les champs financiers aux offres
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS file_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS annual_insurance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS contract_duration INTEGER DEFAULT 36,
ADD COLUMN IF NOT EXISTS contract_terms TEXT DEFAULT 'Livraison incluse - Maintenance incluse - Garantie en échange direct incluse';

-- 2. Ajouter le numéro de TVA aux personnalisations d'entreprise
ALTER TABLE company_customizations 
ADD COLUMN IF NOT EXISTS company_vat_number TEXT;

-- 3. Ajouter un commentaire pour documenter ces champs
COMMENT ON COLUMN offers.file_fee IS 'Frais de dossier unique pour l''offre';
COMMENT ON COLUMN offers.annual_insurance IS 'Montant de l''assurance annuelle';
COMMENT ON COLUMN offers.contract_duration IS 'Durée du contrat en mois (par défaut 36)';
COMMENT ON COLUMN offers.contract_terms IS 'Termes du contrat personnalisables';
COMMENT ON COLUMN company_customizations.company_vat_number IS 'Numéro de TVA de l''entreprise';