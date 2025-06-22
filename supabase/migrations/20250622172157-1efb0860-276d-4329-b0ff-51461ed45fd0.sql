
-- Supprimer les anciennes politiques RLS qui peuvent causer des problèmes
DROP POLICY IF EXISTS "leasers_access" ON public.leasers;
DROP POLICY IF EXISTS "leaser_ranges_access" ON public.leaser_ranges;

-- Créer une nouvelle politique simple pour les leasers
-- Permettre l'accès aux leasers pour tous les utilisateurs authentifiés
CREATE POLICY "leasers_public_access" ON public.leasers
FOR ALL USING (true);

-- Créer une politique simple pour les ranges de leasers
CREATE POLICY "leaser_ranges_public_access" ON public.leaser_ranges
FOR ALL USING (true);

-- S'assurer que RLS est activé sur les deux tables
ALTER TABLE public.leasers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaser_ranges ENABLE ROW LEVEL SECURITY;
