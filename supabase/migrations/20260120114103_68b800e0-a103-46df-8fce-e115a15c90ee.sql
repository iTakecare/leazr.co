-- 1. Créer la fonction pour valider un token d'upload (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_valid_offer_upload_token(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.offer_upload_links 
    WHERE token = p_token 
      AND expires_at > now() 
      AND used_at IS NULL
  );
END;
$$;

-- 2. Créer la fonction pour vérifier si une offre a un lien actif
CREATE OR REPLACE FUNCTION public.has_active_offer_upload_link(p_offer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.offer_upload_links 
    WHERE offer_id = p_offer_id 
      AND expires_at > now() 
      AND used_at IS NULL
  );
END;
$$;

-- 3. Créer la fonction pour récupérer l'offer_id d'un token valide
CREATE OR REPLACE FUNCTION public.get_offer_id_from_token(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer_id uuid;
BEGIN
  SELECT offer_id INTO v_offer_id
  FROM public.offer_upload_links 
  WHERE token = p_token 
    AND expires_at > now() 
    AND used_at IS NULL;
  RETURN v_offer_id;
END;
$$;

-- 4. Créer la fonction pour marquer un lien comme utilisé
CREATE OR REPLACE FUNCTION public.mark_upload_token_used(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.offer_upload_links 
  SET used_at = now() 
  WHERE token = p_token 
    AND used_at IS NULL;
  RETURN FOUND;
END;
$$;

-- 5. Supprimer les anciennes policies sur offer_documents qui utilisent le SELECT direct
DROP POLICY IF EXISTS "offer_documents_secure_token_select" ON public.offer_documents;
DROP POLICY IF EXISTS "offer_documents_secure_token_insert" ON public.offer_documents;

-- 6. Créer les nouvelles policies pour offer_documents utilisant les fonctions SECURITY DEFINER
CREATE POLICY "offer_documents_token_select" ON public.offer_documents
FOR SELECT USING (
  public.has_active_offer_upload_link(offer_id)
  OR auth.uid() IS NOT NULL
);

CREATE POLICY "offer_documents_token_insert" ON public.offer_documents
FOR INSERT WITH CHECK (
  public.has_active_offer_upload_link(offer_id)
  OR auth.uid() IS NOT NULL
);

-- 7. Supprimer l'ancienne policy de storage pour les uploads avec token
DROP POLICY IF EXISTS "Allow document uploads with valid token" ON storage.objects;

-- 8. Créer la nouvelle policy de storage utilisant la fonction SECURITY DEFINER
CREATE POLICY "Allow document uploads with valid token" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'offer-documents' 
  AND (
    -- Format: token/filename ou offer-{id}/token/filename
    public.is_valid_offer_upload_token((storage.foldername(name))[1])
    OR public.is_valid_offer_upload_token((storage.foldername(name))[2])
  )
);

-- 9. Accorder les permissions d'exécution aux fonctions pour anon et authenticated
GRANT EXECUTE ON FUNCTION public.is_valid_offer_upload_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_offer_upload_link(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_offer_id_from_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_upload_token_used(text) TO anon, authenticated;