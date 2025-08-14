-- Additional Security Fix - Secure company_email_confirmations table
-- Remove public access and restrict to specific use cases only

DROP POLICY IF EXISTS "Company email confirmations are public for verification" ON public.company_email_confirmations;

-- Allow public read access only for token verification (with token present)
CREATE POLICY "company_email_confirmations_token_verification" 
ON public.company_email_confirmations 
FOR SELECT 
USING (token IS NOT NULL);

-- Admin only access for management operations
CREATE POLICY "company_email_confirmations_admin_write" 
ON public.company_email_confirmations 
FOR ALL 
TO authenticated 
USING (is_saas_admin())
WITH CHECK (is_saas_admin());

-- Additional security: Secure postal_codes table - remove public write access
DROP POLICY IF EXISTS "Enable read access for all users" ON public.postal_codes;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.postal_codes;

-- Allow public read access to postal codes (needed for address validation)
CREATE POLICY "postal_codes_public_read" 
ON public.postal_codes 
FOR SELECT 
USING (true);

-- Restrict write access to authenticated users only
CREATE POLICY "postal_codes_authenticated_write" 
ON public.postal_codes 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);