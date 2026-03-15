CREATE POLICY "Company members can delete tickets"
ON public.support_tickets
FOR DELETE
TO authenticated
USING (company_id IN (
  SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()
));