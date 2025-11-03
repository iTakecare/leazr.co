-- Phase 1.1: Suppression des politiques de stockage conflictuelles
-- Les politiques de storage.objects sont gérées par Supabase
-- On supprime uniquement les politiques qui créent des conflits de sécurité

DROP POLICY IF EXISTS "Allow authenticated users to view pdf-templates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload pdf-templates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update pdf-templates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete pdf-templates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view pdf-templates-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload to pdf-templates-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update pdf-templates-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete pdf-templates-assets" ON storage.objects;