-- Correction de la récursion infinie - le problème vient de la jointure avec clients
-- Je vais temporairement désactiver RLS sur les offres pour tester, puis créer une politique ultra-simple

-- Étape 1: Désactiver temporairement RLS pour diagnostic
ALTER TABLE public.offers DISABLE ROW LEVEL SECURITY;

-- Étape 2: Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "offers_unified_access" ON public.offers;

-- Étape 3: Réactiver RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Étape 4: Créer une politique ultra-basique qui fonctionne garantie
CREATE POLICY "offers_admin_only_temp"
ON public.offers
FOR ALL
TO public
USING (
  -- Seulement pour les admins pour commencer
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
  )
);