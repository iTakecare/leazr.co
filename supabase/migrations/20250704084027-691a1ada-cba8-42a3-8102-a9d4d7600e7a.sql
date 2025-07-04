-- Corriger le pays dans les données de facturation existantes
UPDATE public.invoices 
SET billing_data = jsonb_set(billing_data, '{leaser_data,country}', '"Belgique"')
WHERE id = 'd1968299-1aa4-4ad7-b3f6-0a6278d0c78c' 
AND billing_data->'leaser_data'->>'country' = 'Belgioque';