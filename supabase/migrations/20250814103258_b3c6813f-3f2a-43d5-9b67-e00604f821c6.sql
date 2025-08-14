-- Corriger le statut d'iTakecare qui a un plan business valide mais est marqué comme trial
UPDATE public.companies 
SET account_status = 'active'
WHERE name = 'iTakecare' 
  AND plan = 'business' 
  AND subscription_ends_at > now()
  AND account_status = 'trial';