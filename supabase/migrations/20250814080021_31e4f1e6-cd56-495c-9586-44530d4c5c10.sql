-- Security Fix: Remove overly permissive public access to pdf_models table
-- This prevents exposure of sensitive business information like company names, 
-- addresses, phone numbers, and email addresses to unauthorized users

-- Drop the overly permissive policy that allows public read access
DROP POLICY IF EXISTS "pdf_models_read_all" ON public.pdf_models;

-- Ensure proper company isolation - only allow access to users within the same company
-- The existing policies should handle this, but let's verify they're correctly set up

-- Verify that pdf_models table has proper RLS enabled
ALTER TABLE public.pdf_models ENABLE ROW LEVEL SECURITY;

-- Clean up duplicate policies and ensure we have the right ones
DROP POLICY IF EXISTS "pdf_models_authenticated_manage" ON public.pdf_models;

-- Keep only the secure company isolation policies
-- This policy already exists and is correct: pdf_models_company_isolation
-- This policy already exists and is correct: pdf_models_secure_company_access

-- Add a comment to document the security fix
COMMENT ON TABLE public.pdf_models IS 'PDF models containing sensitive business information. Access restricted to company users only via RLS policies.';