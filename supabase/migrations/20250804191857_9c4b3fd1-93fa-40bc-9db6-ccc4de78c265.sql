-- Ajouter le champ logo_url à la table clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Créer une fonction pour s'assurer que le bucket client-logos existe
CREATE OR REPLACE FUNCTION public.ensure_client_logos_bucket()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Cette fonction sera appelée pour s'assurer que le bucket existe
  -- Le bucket sera créé via le service fileStorage.ts côté frontend
  RETURN true;
END;
$$;