-- Supprimer la fonction dupliquée avec le type UUID
DROP FUNCTION IF EXISTS public.sign_contract_public(uuid, text, text, text, text, text);

-- Ne garder que la version avec TEXT pour p_signature_token