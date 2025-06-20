
-- Activer RLS sur la table ambassador_clients si pas déjà fait
ALTER TABLE public.ambassador_clients ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques s'il y en a
DROP POLICY IF EXISTS "Ambassadors can view their own clients" ON public.ambassador_clients;
DROP POLICY IF EXISTS "Ambassadors can insert their own clients" ON public.ambassador_clients;
DROP POLICY IF EXISTS "Ambassadors can delete their client relationships" ON public.ambassador_clients;

-- Créer une politique pour permettre aux ambassadeurs de voir leurs propres clients
CREATE POLICY "Ambassadors can view their own clients" 
  ON public.ambassador_clients 
  FOR SELECT 
  USING (
    ambassador_id IN (
      SELECT id FROM public.ambassadors WHERE user_id = auth.uid()
    )
  );

-- Créer une politique pour permettre aux ambassadeurs d'ajouter des clients
CREATE POLICY "Ambassadors can insert their own clients" 
  ON public.ambassador_clients 
  FOR INSERT 
  WITH CHECK (
    ambassador_id IN (
      SELECT id FROM public.ambassadors WHERE user_id = auth.uid()
    )
  );

-- Créer une politique pour permettre aux ambassadeurs de supprimer leurs relations clients
CREATE POLICY "Ambassadors can delete their client relationships" 
  ON public.ambassador_clients 
  FOR DELETE 
  USING (
    ambassador_id IN (
      SELECT id FROM public.ambassadors WHERE user_id = auth.uid()
    )
  );
