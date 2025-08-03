-- Corriger l'offre avec les valeurs exactes du calculateur
UPDATE public.offers 
SET 
  coefficient = 3.160,  -- Coefficient exact Grenke pour tranche 2500-5000
  financed_amount = 5799.32,  -- Montant financé exact du calculateur
  amount = 5799.32,  -- Synchroniser amount avec financed_amount
  margin = 1777.32,  -- Marge exacte du calculateur
  monthly_payment = 187.04,  -- Mensualité exacte du calculateur
  leaser_id = 'd60b86d7-a129-4a17-a877-e8e5caa66949',  -- Grenke
  updated_at = NOW()
WHERE id = 'ae7600ff-ae18-4dd0-b343-73e5c38f5a1e';

-- Mise à jour des coefficients Grenke pour utiliser les valeurs exactes
UPDATE public.leaser_ranges 
SET coefficient = 3.160 
WHERE leaser_id = 'd60b86d7-a129-4a17-a877-e8e5caa66949' 
  AND min = 2500 
  AND max = 5000;