-- Supprimer la vue public_platform_settings qui pose un problème de sécurité
-- Elle contourne les politiques RLS avec "WHERE true"
DROP VIEW IF EXISTS public.public_platform_settings;

-- Créer une politique RLS pour permettre l'accès public aux paramètres de plateforme
-- (nécessaire pour afficher le logo sur la page de connexion)
CREATE POLICY "Allow public read access to platform settings"
ON public.platform_settings
FOR SELECT
USING (true);