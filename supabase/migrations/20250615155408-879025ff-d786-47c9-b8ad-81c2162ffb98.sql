-- Désactiver temporairement RLS pour tester
ALTER TABLE public.ambassadors DISABLE ROW LEVEL SECURITY;

-- Puis réactiver avec des politiques plus simples
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Ambassadors are viewable by company members" ON public.ambassadors;
DROP POLICY IF EXISTS "Company admins can insert ambassadors" ON public.ambassadors;
DROP POLICY IF EXISTS "Company admins can update ambassadors" ON public.ambassadors;
DROP POLICY IF EXISTS "Company admins can delete ambassadors" ON public.ambassadors;

-- Créer une politique simple pour tous les utilisateurs authentifiés (temporaire pour déboguer)
CREATE POLICY "Allow all authenticated users to view ambassadors" 
ON public.ambassadors 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Allow all authenticated users to manage ambassadors" 
ON public.ambassadors 
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);