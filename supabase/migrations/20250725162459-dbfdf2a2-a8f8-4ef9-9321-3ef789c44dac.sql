-- Ajouter une policy de lecture publique pour platform_settings
CREATE POLICY "platform_settings_public_read" 
ON public.platform_settings 
FOR SELECT 
USING (true);

-- Modifier la policy existante pour ne s'appliquer qu'aux opérations d'écriture
DROP POLICY IF EXISTS "platform_settings_admin_only" ON public.platform_settings;

CREATE POLICY "platform_settings_admin_write" 
ON public.platform_settings 
FOR ALL 
USING (is_saas_admin())
WITH CHECK (is_saas_admin());