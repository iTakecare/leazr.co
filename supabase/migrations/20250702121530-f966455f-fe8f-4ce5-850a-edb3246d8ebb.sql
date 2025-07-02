-- Ajouter des politiques RLS pour permettre aux clients d'accéder à leurs propres équipements

-- Politique pour permettre aux clients d'accéder à leurs propres collaborateurs
CREATE POLICY "clients_can_view_own_collaborators" 
ON public.collaborators 
FOR SELECT 
USING (
  client_id IN (
    SELECT id FROM public.clients 
    WHERE user_id = auth.uid()
  )
);

-- Politique pour permettre aux clients d'accéder aux équipements de leurs contrats
CREATE POLICY "clients_can_view_own_contract_equipment" 
ON public.contract_equipment 
FOR SELECT 
USING (
  contract_id IN (
    SELECT c.id FROM public.contracts c
    JOIN public.clients cl ON c.client_id = cl.id
    WHERE cl.user_id = auth.uid()
  )
);

-- Politique pour permettre aux clients de voir l'historique d'assignation de leurs équipements
CREATE POLICY "clients_can_view_own_equipment_history" 
ON public.equipment_assignments_history 
FOR SELECT 
USING (
  collaborator_id IN (
    SELECT col.id FROM public.collaborators col
    JOIN public.clients cl ON col.client_id = cl.id
    WHERE cl.user_id = auth.uid()
  )
);