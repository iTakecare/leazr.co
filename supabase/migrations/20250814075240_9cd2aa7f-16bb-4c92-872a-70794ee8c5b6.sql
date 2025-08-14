-- Security Fix: Secure company_email_confirmations table
-- This addresses the critical security issue where email confirmations were publicly accessible

-- Remove the overly permissive policy
DROP POLICY IF EXISTS "Company email confirmations are public for verification" ON public.company_email_confirmations;

-- Create more restrictive policies
-- Allow anonymous users to read confirmation tokens (needed for email verification)
CREATE POLICY "company_email_confirmations_public_select" 
ON public.company_email_confirmations 
FOR SELECT 
USING (true);

-- Only authenticated admin users can write/update
CREATE POLICY "company_email_confirmations_admin_manage" 
ON public.company_email_confirmations 
FOR ALL 
TO authenticated 
USING (is_saas_admin())
WITH CHECK (is_saas_admin());