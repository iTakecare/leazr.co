-- Nouveau mode de barème « Marge réduite + forfait par PC » (offres hors support).
-- L'ambassadeur applique une marge réduite (ex. 30 % au lieu de 40-50 %) car le
-- support n'est pas fourni, et touche un montant fixe par PC (fixed_rate).
-- margin_rate = taux de marge (%) appliqué par défaut aux offres de l'ambassadeur.

ALTER TABLE commission_levels
  ADD COLUMN IF NOT EXISTS margin_rate numeric;

COMMENT ON COLUMN commission_levels.margin_rate IS
  'Taux de marge (%) appliqué par défaut aux offres (mode fixed_per_pc_reduced_margin)';

ALTER TABLE commission_levels
  DROP CONSTRAINT IF EXISTS commission_levels_calculation_mode_check;

ALTER TABLE commission_levels
  ADD CONSTRAINT commission_levels_calculation_mode_check
  CHECK (calculation_mode IN (
    'margin',
    'purchase_price',
    'monthly_payment',
    'one_monthly_rounded_up',
    'fixed_per_pc',
    'fixed_amount',
    'fixed_per_pc_reduced_margin'
  ));
