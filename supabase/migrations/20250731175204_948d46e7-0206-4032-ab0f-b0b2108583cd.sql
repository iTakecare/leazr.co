-- Supprimer la politique restrictive actuelle
DROP POLICY IF EXISTS "Allow anonymous token verification" ON public.custom_auth_tokens;

-- Créer une nouvelle politique plus permissive pour l'accès anonyme
CREATE POLICY "Anonymous can read all tokens" ON public.custom_auth_tokens 
FOR SELECT TO anon, public
USING (true);