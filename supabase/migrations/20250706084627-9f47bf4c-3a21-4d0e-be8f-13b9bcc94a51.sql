-- Supprimer les politiques RLS existantes restrictives sur pdf_models
DROP POLICY IF EXISTS "pdf_models_admin_manage" ON public.pdf_models;
DROP POLICY IF EXISTS "pdf_models_public_read" ON public.pdf_models;

-- Créer des politiques RLS plus permissives pour les utilisateurs authentifiés
CREATE POLICY "pdf_models_authenticated_manage" 
ON public.pdf_models 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Politique de lecture publique maintenue
CREATE POLICY "pdf_models_read_all" 
ON public.pdf_models 
FOR SELECT 
USING (true);