
-- Corriger les politiques RLS pour les ambassadeurs

-- Politique pour ambassador_clients - permettre aux ambassadeurs de voir leurs propres clients
CREATE POLICY "ambassadors_can_view_their_clients" ON public.ambassador_clients
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.ambassadors a
    WHERE a.id = ambassador_clients.ambassador_id
    AND a.user_id = auth.uid()
  )
);

-- Politique pour clients - permettre aux ambassadeurs de voir les clients qui leur sont assignés
CREATE POLICY "ambassadors_can_view_assigned_clients" ON public.clients
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.ambassador_clients ac
    JOIN public.ambassadors a ON ac.ambassador_id = a.id
    WHERE ac.client_id = clients.id
    AND a.user_id = auth.uid()
  )
);

-- Politique pour clients - permettre aux ambassadeurs de créer des clients
CREATE POLICY "ambassadors_can_create_clients" ON public.clients
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ambassadors a
    WHERE a.user_id = auth.uid()
  )
);

-- Politique pour clients - permettre aux ambassadeurs de modifier leurs clients assignés
CREATE POLICY "ambassadors_can_update_assigned_clients" ON public.clients
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.ambassador_clients ac
    JOIN public.ambassadors a ON ac.ambassador_id = a.id
    WHERE ac.client_id = clients.id
    AND a.user_id = auth.uid()
  )
);

-- Politique pour clients - permettre aux ambassadeurs de supprimer leurs clients assignés
CREATE POLICY "ambassadors_can_delete_assigned_clients" ON public.clients
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.ambassador_clients ac
    JOIN public.ambassadors a ON ac.ambassador_id = a.id
    WHERE ac.client_id = clients.id
    AND a.user_id = auth.uid()
  )
);

-- Politique pour ambassadors - permettre aux ambassadeurs de voir leur propre profil
CREATE POLICY "ambassadors_can_view_own_profile" ON public.ambassadors
FOR SELECT USING (user_id = auth.uid());

-- Politique pour ambassadors - permettre aux ambassadeurs de mettre à jour leur profil
CREATE POLICY "ambassadors_can_update_own_profile" ON public.ambassadors
FOR UPDATE USING (user_id = auth.uid());
