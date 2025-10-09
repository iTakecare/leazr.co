-- Supprimer l'ancienne contrainte qui n'autorise que 'margin' et 'purchase_price'
ALTER TABLE commission_levels 
DROP CONSTRAINT IF EXISTS commission_levels_calculation_mode_check;

-- Ajouter la nouvelle contrainte avec les 3 valeurs autorisées
ALTER TABLE commission_levels 
ADD CONSTRAINT commission_levels_calculation_mode_check 
CHECK (calculation_mode IN ('margin', 'purchase_price', 'monthly_payment'));