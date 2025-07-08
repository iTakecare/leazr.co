-- Supprimer la politique existante et la recréer correctement
DROP POLICY IF EXISTS "Allow company creation during signup" ON public.companies;

-- Créer une nouvelle politique pour permettre la création d'entreprises lors de l'inscription
CREATE POLICY "Allow company creation during signup" 
ON public.companies 
FOR INSERT 
TO authenticated, anon
WITH CHECK (true);