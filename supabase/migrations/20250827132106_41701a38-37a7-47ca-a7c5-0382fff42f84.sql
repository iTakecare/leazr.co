-- Allow clients to create their own client requests
-- This fixes the RLS violation when clients try to submit requests from their dashboard

-- Drop the existing restrictive policy for offers creation
DROP POLICY IF EXISTS "offers_company_isolation_create" ON public.offers;
DROP POLICY IF EXISTS "offers_admin_create" ON public.offers;

-- Create a new policy that allows clients to create client_request type offers
CREATE POLICY "offers_client_requests_create" ON public.offers
FOR INSERT 
WITH CHECK (
  -- Allow admins to create any type of offer
  (is_admin_optimized())
  OR
  -- Allow company users to create offers for their company
  (auth.uid() IS NOT NULL AND company_id = get_user_company_id())
  OR
  -- Allow clients to create client_request type offers when they're authenticated
  -- and the client_id corresponds to a client they have access to
  (
    auth.uid() IS NOT NULL 
    AND type = 'client_request'
    AND client_id IN (
      SELECT c.id 
      FROM clients c 
      WHERE c.user_id = auth.uid()
    )
  )
);

-- Ensure the select policy allows clients to see their own offers
DROP POLICY IF EXISTS "offers_client_access" ON public.offers;
CREATE POLICY "offers_client_access" ON public.offers
FOR SELECT 
USING (
  -- Admins can see everything
  (is_admin_optimized())
  OR
  -- Company users can see their company's offers
  (company_id = get_user_company_id())
  OR
  -- Clients can see their own offers
  (
    auth.uid() IS NOT NULL 
    AND client_id IN (
      SELECT c.id 
      FROM clients c 
      WHERE c.user_id = auth.uid()
    )
  )
);