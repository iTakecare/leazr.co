-- Corriger les données financières pour l'offre problématique
UPDATE public.offers 
SET 
  -- Recalculer le coefficient basé sur un coefficient réaliste
  coefficient = CASE 
    WHEN monthly_payment > 0 AND amount > 0 THEN 
      ROUND((monthly_payment * 100) / amount, 2)
    ELSE 
      2.8 
  END,
  -- Si amount = monthly_payment, corriger le montant d'achat en utilisant un coefficient réaliste
  amount = CASE 
    WHEN amount = monthly_payment AND monthly_payment > 0 THEN 
      ROUND(monthly_payment * 2.0, 2)  -- Coefficient réaliste de 2.0 pour retrouver le prix d'achat
    ELSE 
      amount 
  END,
  -- Recalculer financed_amount comme montant d'achat + marge
  financed_amount = CASE 
    WHEN amount = monthly_payment AND monthly_payment > 0 THEN 
      ROUND((monthly_payment * 2.0) + (monthly_payment * 2.0 * 0.15), 2) -- Prix d'achat + 15% marge
    ELSE 
      ROUND(amount + (amount * 0.15), 2)
  END,
  -- Recalculer la marge
  margin = CASE 
    WHEN amount = monthly_payment AND monthly_payment > 0 THEN 
      ROUND((monthly_payment * 2.0) * 0.15, 2) -- 15% du prix d'achat
    ELSE 
      ROUND(amount * 0.15, 2)
  END,
  updated_at = NOW()
WHERE 
  type = 'client_request' 
  AND (amount = monthly_payment OR coefficient < 1.5 OR coefficient > 4.0);