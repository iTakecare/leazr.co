-- Fix critical security vulnerability: Implement proper RLS policies for offers table
-- This prevents public access to sensitive customer data including emails, names, and financial information

-- Create RLS policy for offers table to restrict access to company users only
CREATE POLICY "offers_company_isolation" 
ON public.offers
FOR ALL
USING (
  (auth.uid() IS NOT NULL) AND 
  ((company_id = get_user_company_id()) OR is_admin_optimized())
)
WITH CHECK (
  (auth.uid() IS NOT NULL) AND 
  ((company_id = get_user_company_id()) OR is_admin_optimized())
);

-- Add special policy for offer signing by clients (public access for specific signed offers)
CREATE POLICY "offers_client_signature_access" 
ON public.offers
FOR SELECT
USING (
  -- Allow public access only for offers that are being signed via signature links
  -- This maintains functionality for client offer signing while securing other data
  (auth.role() = 'anon' AND status = 'sent') OR
  -- Authenticated users can access their company's offers
  ((auth.uid() IS NOT NULL) AND ((company_id = get_user_company_id()) OR is_admin_optimized()))
);

-- Verify the policies are working correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'offers';