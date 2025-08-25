-- Add simple RLS policy for partner_commissions based on available columns
CREATE POLICY "partner_commissions_authenticated_access" 
ON public.partner_commissions
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);