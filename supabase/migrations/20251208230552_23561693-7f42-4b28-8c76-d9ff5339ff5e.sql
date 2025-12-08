-- Ajouter une policy DELETE explicite pour les admins
CREATE POLICY "offers_admin_delete" ON public.offers
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
    AND p.company_id = offers.company_id
  )
);