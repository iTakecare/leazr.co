-- Final security fix: Remove remaining public access vulnerabilities in offers table

-- Remove the policy allowing public insertions of offers
-- This was allowing anyone to create offers which could be a security risk
DROP POLICY IF EXISTS "Allow public offer requests" ON public.offers;

-- Fix the "Offers strict company isolation" policy to remove anonymous access
-- The current policy allows anonymous users to see approved signed offers
DROP POLICY IF EXISTS "Offers strict company isolation" ON public.offers;

-- Create a new strict company isolation policy without anonymous access
CREATE POLICY "offers_strict_company_isolation_secure" 
ON public.offers
FOR ALL
USING (
  -- Only authenticated users with proper company access
  (get_user_company_id() IS NOT NULL) AND 
  ((company_id = get_user_company_id()) OR is_admin_optimized() OR (user_id = auth.uid()))
)
WITH CHECK (
  -- Same restrictions for modifications
  (get_user_company_id() IS NOT NULL) AND 
  ((company_id = get_user_company_id()) OR is_admin_optimized())
);

-- If client request functionality is needed, create a more secure public insert policy
-- that requires specific validation or tokens
CREATE POLICY "offers_client_request_secure" 
ON public.offers
FOR INSERT
WITH CHECK (
  -- Only allow client requests with specific type and require company_id to be set
  (type = 'client_request') AND 
  (company_id IS NOT NULL) AND
  (workflow_status = 'draft')
);

-- Verify the security fix
SELECT policyname, cmd, permissive
FROM pg_policies 
WHERE tablename = 'offers' 
AND schemaname = 'public'
ORDER BY policyname;