-- Ajouter simplement la colonne contract_end_date à la table contracts
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS contract_end_date DATE;