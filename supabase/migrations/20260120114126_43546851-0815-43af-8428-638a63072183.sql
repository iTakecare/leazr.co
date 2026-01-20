-- Créer la fonction RPC pour valider et récupérer les données du token d'upload
-- Cette fonction est SECURITY DEFINER pour permettre aux utilisateurs anon d'accéder aux données
CREATE OR REPLACE FUNCTION public.validate_upload_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', id::text,
    'offer_id', offer_id::text,
    'token', token,
    'requested_documents', requested_documents,
    'custom_message', custom_message,
    'expires_at', expires_at::text,
    'used_at', used_at::text,
    'created_by', created_by::text,
    'created_at', created_at::text
  ) INTO v_result
  FROM public.offer_upload_links 
  WHERE token = p_token 
    AND expires_at > now() 
    AND used_at IS NULL;
  
  RETURN v_result;
END;
$$;

-- Accorder les permissions d'exécution à anon et authenticated
GRANT EXECUTE ON FUNCTION public.validate_upload_token(text) TO anon, authenticated;