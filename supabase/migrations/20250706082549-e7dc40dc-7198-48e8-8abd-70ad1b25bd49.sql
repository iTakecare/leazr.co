-- Supprimer toutes les politiques RLS existantes sur pdf_models
DROP POLICY IF EXISTS "Admin manage pdf_models" ON public.pdf_models;
DROP POLICY IF EXISTS "pdf_models_admin" ON public.pdf_models;
DROP POLICY IF EXISTS "Public read pdf_models" ON public.pdf_models;
DROP POLICY IF EXISTS "pdf_models_admin_write" ON public.pdf_models;
DROP POLICY IF EXISTS "pdf_models_read_all" ON public.pdf_models;

-- Créer de nouvelles politiques RLS utilisant les fonctions sécurisées existantes
CREATE POLICY "pdf_models_admin_manage" 
ON public.pdf_models 
FOR ALL 
USING (is_admin_optimized())
WITH CHECK (is_admin_optimized());

-- Politique de lecture publique pour permettre l'accès en lecture
CREATE POLICY "pdf_models_public_read" 
ON public.pdf_models 
FOR SELECT 
USING (true);