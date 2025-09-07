-- Nettoyer les collaborateurs Winfinance
-- Garder seulement Zakaria Goyer comme gérant principal

-- Supprimer les collaborateurs en trop pour Winfinance
DELETE FROM public.collaborators 
WHERE id IN ('b71924c6-beff-498c-be2c-7f11acea5d52', 'a273409a-5744-4249-acd3-5098ce07a60c');

-- Mettre à jour le collaborateur restant avec les bonnes informations
UPDATE public.collaborators 
SET 
  name = 'Zakaria Goyer',
  role = 'Gérant',
  is_primary = true,
  updated_at = now()
WHERE id = 'b1a477cf-d9d8-425e-8c4c-64015916791c';

-- S'assurer que le client a le bon nom
UPDATE public.clients 
SET 
  name = 'Winfinance SRL',
  contact_name = 'Zakaria Goyer',
  updated_at = now()
WHERE id = '48eba76a-7e2b-4301-8193-52746839de23';