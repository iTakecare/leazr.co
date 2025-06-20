
-- Permettre aux ambassadeurs de créer des clients
CREATE POLICY "Ambassadors can create clients" 
  ON public.clients 
  FOR INSERT 
  WITH CHECK (
    -- Permettre aux ambassadeurs de créer des clients
    EXISTS (
      SELECT 1 FROM public.ambassadors 
      WHERE user_id = auth.uid()
    )
  );

-- Permettre aux ambassadeurs de mettre à jour les clients qu'ils ont amenés
CREATE POLICY "Ambassadors can update their linked clients" 
  ON public.clients 
  FOR UPDATE 
  USING (
    id IN (
      SELECT client_id FROM public.ambassador_clients 
      WHERE ambassador_id IN (
        SELECT id FROM public.ambassadors WHERE user_id = auth.uid()
      )
    )
  );

-- Permettre aux ambassadeurs de supprimer les relations avec leurs clients
CREATE POLICY "Ambassadors can delete their client relationships" 
  ON public.ambassador_clients 
  FOR DELETE 
  USING (
    ambassador_id IN (
      SELECT id FROM public.ambassadors WHERE user_id = auth.uid()
    )
  );
