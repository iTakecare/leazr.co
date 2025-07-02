-- Correction finale: supprimer l'ancienne politique collaborators_access problématique
-- Cette politique contient encore une référence directe à auth.users qui cause l'erreur
-- "permission denied for table users"

DROP POLICY IF EXISTS "collaborators_access" ON public.collaborators;

-- Vérifier que seules les bonnes politiques restent actives
-- La politique collaborators_secure_access devrait maintenant être la seule active