-- Corriger la fonction get_user_company_id et la structure profiles pour l'isolation des ambassadeurs
-- Approche simplifiée en gardant les fonctions existantes

-- Étape 1: Vérifier et corriger la structure de la table profiles
-- Ajout de la colonne email si elle n'existe pas
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;
END $$;

-- Étape 2: Mettre à jour les profils avec les emails des utilisateurs auth.users
UPDATE public.profiles 
SET email = au.email 
FROM auth.users au 
WHERE profiles.id = au.id 
AND profiles.email IS NULL;

-- Étape 3: Recréer la fonction get_user_company_id pour qu'elle soit plus robuste
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_company_id UUID;
  current_user_id UUID;
BEGIN
  -- Récupérer l'ID utilisateur actuel
  current_user_id := auth.uid();
  
  -- Si pas d'utilisateur authentifié, retourner null
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Récupérer company_id depuis profiles
  SELECT company_id INTO user_company_id 
  FROM public.profiles 
  WHERE id = current_user_id
  LIMIT 1;
  
  RETURN user_company_id;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, retourner null
    RETURN NULL;
END;
$$;

-- Étape 4: Vérifier que la politique RLS sur ambassadors est correcte
-- Supprimer et recréer la politique pour être sûr
DROP POLICY IF EXISTS "ambassadors_company_isolation" ON public.ambassadors;

CREATE POLICY "ambassadors_company_isolation" 
ON public.ambassadors 
FOR ALL 
USING (
  -- L'utilisateur doit être authentifié ET appartenir à la même entreprise
  (auth.uid() IS NOT NULL) AND 
  ((company_id = get_user_company_id()) OR is_admin_optimized())
)
WITH CHECK (
  -- Pour les modifications, même logique
  (auth.uid() IS NOT NULL) AND 
  ((company_id = get_user_company_id()) OR is_admin_optimized())
);

-- Test de la fonction pour s'assurer qu'elle fonctionne
SELECT 
  'Test get_user_company_id:' as test_name,
  get_user_company_id() as result_company_id,
  auth.uid() as current_user_id;

-- Test de la politique RLS en cours
SELECT 
  'Test isolation ambassadors:' as test_name,
  COUNT(*) as visible_ambassadors,
  array_agg(name) as ambassador_names
FROM public.ambassadors;