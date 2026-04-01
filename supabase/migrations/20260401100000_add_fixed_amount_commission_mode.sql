-- Ajoute le mode de calcul "fixed_amount" pour les barèmes de commission
-- Ce mode représente un montant fixe en euros ajouté au prix total de la demande,
-- correspondant au montant demandé par l'ambassadeur.
-- La valeur est stockée dans la colonne fixed_rate (en euros).

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
    'fixed_amount'
  ));
