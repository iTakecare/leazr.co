
-- Activer RLS sur les tables ambassadors et ambassador_clients si ce n'est pas déjà fait
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_clients ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux ambassadeurs de voir leur propre profil
CREATE POLICY "Ambassadors can view their own profile" 
  ON public.ambassadors 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Politique pour permettre aux ambassadeurs de mettre à jour leur propre profil
CREATE POLICY "Ambassadors can update their own profile" 
  ON public.ambassadors 
  FOR UPDATE 
  USING (user_id = auth.uid());

-- Politique pour permettre aux ambassadeurs de voir leurs propres clients
CREATE POLICY "Ambassadors can view their own clients" 
  ON public.ambassador_clients 
  FOR SELECT 
  USING (
    ambassador_id IN (
      SELECT id FROM public.ambassadors WHERE user_id = auth.uid()
    )
  );

-- Politique pour permettre aux ambassadeurs d'ajouter des clients
CREATE POLICY "Ambassadors can insert their own clients" 
  ON public.ambassador_clients 
  FOR INSERT 
  WITH CHECK (
    ambassador_id IN (
      SELECT id FROM public.ambassadors WHERE user_id = auth.uid()
    )
  );

-- Politique pour permettre aux ambassadeurs de voir les clients liés
CREATE POLICY "Ambassadors can view linked clients" 
  ON public.clients 
  FOR SELECT 
  USING (
    id IN (
      SELECT client_id FROM public.ambassador_clients 
      WHERE ambassador_id IN (
        SELECT id FROM public.ambassadors WHERE user_id = auth.uid()
      )
    )
  );

-- Politique pour permettre aux ambassadeurs de voir leurs offres
CREATE POLICY "Ambassadors can view their own offers" 
  ON public.offers 
  FOR SELECT 
  USING (
    ambassador_id IN (
      SELECT id FROM public.ambassadors WHERE user_id = auth.uid()
    )
  );

-- Politique pour permettre aux ambassadeurs de créer des offres
CREATE POLICY "Ambassadors can create offers" 
  ON public.offers 
  FOR INSERT 
  WITH CHECK (
    ambassador_id IN (
      SELECT id FROM public.ambassadors WHERE user_id = auth.uid()
    )
  );

-- Politique pour permettre aux ambassadeurs de mettre à jour leurs offres
CREATE POLICY "Ambassadors can update their own offers" 
  ON public.offers 
  FOR UPDATE 
  USING (
    ambassador_id IN (
      SELECT id FROM public.ambassadors WHERE user_id = auth.uid()
    )
  );
