-- Ajouter la colonne payment_day pour le jour de prélèvement SEPA configurable
ALTER TABLE company_customizations 
ADD COLUMN payment_day INTEGER DEFAULT 1;

-- Ajouter une contrainte de validation (1-28 pour éviter les problèmes avec février)
ALTER TABLE company_customizations 
ADD CONSTRAINT payment_day_range CHECK (payment_day >= 1 AND payment_day <= 28);

-- Commentaire pour documentation
COMMENT ON COLUMN company_customizations.payment_day IS 'Jour du mois pour les prélèvements SEPA (1-28)';