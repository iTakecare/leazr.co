-- Maintenant créer le contrat avec l'user_id corrigé
INSERT INTO contracts (
  offer_id,
  client_name,
  client_id,
  monthly_payment,
  equipment_description,
  leaser_name,
  leaser_logo,
  status,
  user_id,
  company_id
)
SELECT 
  o.id,
  o.client_name,
  o.client_id,
  o.monthly_payment,
  o.equipment_description,
  'Grenke' as leaser_name,
  'https://logo.clearbit.com/grenke.com' as leaser_logo,
  'contract_sent' as status,
  o.user_id,
  o.company_id
FROM offers o
WHERE o.id = '50ff7921-c9db-40b5-b568-3e567ac5a983';