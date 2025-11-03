-- Migration 3: Corriger la table rate_limits
-- Le rate limiting est cassé car RLS est activé sans policies
-- Solution: Désactiver RLS car c'est une table système

-- 1. Désactiver RLS sur rate_limits (table système)
ALTER TABLE public.rate_limits DISABLE ROW LEVEL SECURITY;

-- 2. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_window 
ON public.rate_limits(identifier, window_start DESC);

-- 3. Ajouter un commentaire pour expliquer pourquoi RLS est désactivé
COMMENT ON TABLE public.rate_limits IS 
'Table système pour le rate limiting. RLS désactivé car utilisé par les edge functions avec service role key.';

-- 4. S''assurer que la fonction de nettoyage existe
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Supprimer les entrées de plus de 2 heures
  DELETE FROM public.rate_limits 
  WHERE window_start < NOW() - INTERVAL '2 hours';
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_rate_limits() IS
'Nettoie automatiquement les entrées de rate limiting de plus de 2 heures.';