-- Supprimer l'ancienne contrainte
ALTER TABLE commission_levels 
DROP CONSTRAINT IF EXISTS commission_levels_calculation_mode_check;

-- Créer la nouvelle contrainte avec fixed_per_pc inclus
ALTER TABLE commission_levels 
ADD CONSTRAINT commission_levels_calculation_mode_check 
CHECK (calculation_mode IN ('margin', 'purchase_price', 'monthly_payment', 'one_monthly_rounded_up', 'fixed_per_pc'));