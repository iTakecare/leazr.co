-- ============================================================
-- Fix : autoriser les admins authentifiés à uploader directement
-- des documents dans le bucket offer-documents sans token
-- ============================================================

-- 1. Ajouter une policy INSERT storage pour les utilisateurs authentifiés
--    (les uploads admin n'ont pas de token dans le chemin)
DROP POLICY IF EXISTS "Allow authenticated admin uploads to offer-documents" ON storage.objects;
CREATE POLICY "Allow authenticated admin uploads to offer-documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'offer-documents'
  AND auth.uid() IS NOT NULL
);

-- 2. Ajouter une policy UPDATE/DELETE storage pour les admins authentifiés
--    (nécessaire pour supprimer/remplacer des fichiers)
DROP POLICY IF EXISTS "Allow authenticated admin operations on offer-documents" ON storage.objects;
CREATE POLICY "Allow authenticated admin operations on offer-documents" ON storage.objects
FOR ALL USING (
  bucket_id = 'offer-documents'
  AND auth.uid() IS NOT NULL
);

-- 3. S'assurer que les utilisateurs authentifiés peuvent insérer dans offer_documents
--    La policy existante "offer_documents_token_insert" couvre déjà auth.uid() IS NOT NULL
--    mais au cas où elle aurait été remplacée, on la recrée proprement
DROP POLICY IF EXISTS "offer_documents_admin_insert" ON public.offer_documents;
CREATE POLICY "offer_documents_admin_insert" ON public.offer_documents
FOR INSERT WITH CHECK (
  -- Upload avec token valide (flux client)
  public.has_active_offer_upload_link(offer_id)
  -- OU utilisateur authentifié (flux admin)
  OR auth.uid() IS NOT NULL
);
