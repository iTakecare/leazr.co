
-- Corriger les politiques RLS pour ambassador_clients
-- Supprimer les anciennes politiques problématiques
DROP POLICY IF EXISTS "Ambassadors can view their own clients" ON public.ambassador_clients;
DROP POLICY IF EXISTS "Ambassadors can insert their own clients" ON public.ambassador_clients;
DROP POLICY IF EXISTS "Ambassadors can delete their client relationships" ON public.ambassador_clients;

-- Créer de nouvelles politiques qui n'accèdent pas à auth.users
CREATE POLICY "Ambassador clients view policy" 
  ON public.ambassador_clients 
  FOR SELECT 
  USING (
    ambassador_id IN (
      SELECT id FROM public.ambassadors 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Ambassador clients insert policy" 
  ON public.ambassador_clients 
  FOR INSERT 
  WITH CHECK (
    ambassador_id IN (
      SELECT id FROM public.ambassadors 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Ambassador clients delete policy" 
  ON public.ambassador_clients 
  FOR DELETE 
  USING (
    ambassador_id IN (
      SELECT id FROM public.ambassadors 
      WHERE user_id = auth.uid()
    )
  );

-- Également corriger les politiques sur la table ambassadors si nécessaire
DROP POLICY IF EXISTS "Ambassadors can view their own profile" ON public.ambassadors;
DROP POLICY IF EXISTS "Ambassadors can update their own profile" ON public.ambassadors;

CREATE POLICY "Ambassador profile view policy" 
  ON public.ambassadors 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Ambassador profile update policy" 
  ON public.ambassadors 
  FOR UPDATE 
  USING (user_id = auth.uid());
