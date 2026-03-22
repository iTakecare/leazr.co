-- Mettre à jour contract_end_date basée sur contract_start_date + contract_duration
-- La date de fin est arrondie au prochain début de trimestre (1er jan, 1er avr, 1er juil, 1er oct)
UPDATE contracts
SET contract_end_date = (
  CASE 
    -- Si la date brute (start + duration) tombe exactement un 1er jan/avr/juil/oct, on la garde
    WHEN EXTRACT(DAY FROM (contract_start_date + (contract_duration || ' months')::interval)) = 1
     AND EXTRACT(MONTH FROM (contract_start_date + (contract_duration || ' months')::interval)) IN (1, 4, 7, 10)
    THEN (contract_start_date + (contract_duration || ' months')::interval)::date
    -- Sinon, on arrondit au prochain début de trimestre
    ELSE (
      date_trunc('quarter', (contract_start_date + (contract_duration || ' months')::interval)::date + interval '3 months')
    )::date
  END
)
WHERE contract_start_date IS NOT NULL 
  AND contract_duration IS NOT NULL 
  AND contract_end_date IS NULL;