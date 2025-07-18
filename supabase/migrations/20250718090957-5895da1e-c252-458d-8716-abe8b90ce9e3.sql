
-- Corriger les politiques RLS pour les tables netlify_deployments et netlify_configurations
-- Supprimer les politiques existantes restrictives
DROP POLICY IF EXISTS "Admin SaaS peut gérer tous les déploiements" ON public.netlify_deployments;
DROP POLICY IF EXISTS "Admin SaaS peut gérer toutes les configurations" ON public.netlify_configurations;

-- Créer des politiques RLS plus permissives pour l'admin SaaS
CREATE POLICY "Admin SaaS can manage all deployments" 
ON public.netlify_deployments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'ecommerce@itakecare.be'
  )
  OR is_admin_optimized()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'ecommerce@itakecare.be'
  )
  OR is_admin_optimized()
);

CREATE POLICY "Admin SaaS can manage all configurations" 
ON public.netlify_configurations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'ecommerce@itakecare.be'
  )
  OR is_admin_optimized()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'ecommerce@itakecare.be'
  )
  OR is_admin_optimized()
);

-- Créer des politiques de lecture publique pour permettre l'accès en cas de besoin
CREATE POLICY "Public read netlify_deployments for admin" 
ON public.netlify_deployments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'ecommerce@itakecare.be'
  )
  OR is_admin_optimized()
);

CREATE POLICY "Public read netlify_configurations for admin" 
ON public.netlify_configurations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'ecommerce@itakecare.be'
  )
  OR is_admin_optimized()
);
