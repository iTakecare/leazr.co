-- Critical Security Fix: Remove overly permissive public access policies for offers table
-- These policies were allowing public access to all customer data, emails, and financial information

-- Drop problematic policies that allow broad public access
DROP POLICY IF EXISTS "Public can view signed offers" ON public.offers;
DROP POLICY IF EXISTS "Public offers can be read for signing" ON public.offers;

-- Keep the more restrictive policies for legitimate use cases:
-- 1. "Public access for valid upload tokens" - allows access only with valid upload tokens
-- 2. "Offers strict company isolation" - properly restricts access to company members
-- 3. Company-based access policies remain intact

-- Update the client signature access policy to be more restrictive
-- Only allow access to offers with valid signature links rather than broad public access
DROP POLICY IF EXISTS "offers_client_signature_access" ON public.offers;

-- Create a more secure policy for offer signing that requires specific offer IDs
-- This should be used in conjunction with a secure signature link system
CREATE POLICY "offers_secure_signature_access" 
ON public.offers
FOR SELECT
USING (
  -- Only authenticated company users can see offers
  ((auth.uid() IS NOT NULL) AND ((company_id = get_user_company_id()) OR is_admin_optimized())) OR
  -- OR offers that have valid upload tokens (existing secure system)
  (id IN ( 
    SELECT offer_upload_links.offer_id
    FROM offer_upload_links
    WHERE (offer_upload_links.expires_at > now()) AND (offer_upload_links.used_at IS NULL)
  ))
);

-- Verify remaining policies are secure
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'offers' 
ORDER BY policyname;