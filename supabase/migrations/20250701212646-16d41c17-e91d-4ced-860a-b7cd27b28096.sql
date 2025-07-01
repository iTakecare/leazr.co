-- Créer des entrées d'historique de test pour le contrat actuel
INSERT INTO public.contract_workflow_logs (
  contract_id, 
  user_id, 
  previous_status, 
  new_status, 
  reason, 
  user_name
) 
SELECT 
  'fb5ec74a-4893-4da0-8123-9886b1e5f270'::uuid,
  c.user_id,
  'contract_sent',
  'contract_signed',
  'Contrat signé par le client',
  COALESCE(p.first_name || ' ' || p.last_name, 'Utilisateur système')
FROM public.contracts c
LEFT JOIN public.profiles p ON c.user_id = p.id
WHERE c.id = 'fb5ec74a-4893-4da0-8123-9886b1e5f270'::uuid
LIMIT 1;