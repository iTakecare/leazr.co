-- Supprimer la fonction get_contract_for_signature qui utilise le type TEXT
-- pour résoudre l'ambiguïté avec la version UUID
DROP FUNCTION IF EXISTS public.get_contract_for_signature(text);