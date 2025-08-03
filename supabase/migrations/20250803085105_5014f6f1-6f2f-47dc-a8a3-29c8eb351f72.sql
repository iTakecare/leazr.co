-- Corriger l'offre actuelle avec les bons calculs de Grenke
UPDATE public.offers 
SET 
  coefficient = 3.24,  -- Coefficient Grenke pour montant 5000-10000
  financed_amount = 5802,  -- Prix d'achat (5045) + marge (757)
  margin = 757,  -- 15% de 5045
  leaser_id = 'd60b86d7-a129-4a17-a877-e8e5caa66949',  -- Grenke
  updated_at = NOW()
WHERE id = 'ae7600ff-ae18-4dd0-b343-73e5c38f5a1e';