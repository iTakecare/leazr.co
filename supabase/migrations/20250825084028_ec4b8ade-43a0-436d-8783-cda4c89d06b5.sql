-- Critical Security Fix: Secure companies table from unauthorized access
-- Remove policies that could expose sensitive business data to competitors

-- First, let's examine current policies on companies table
SELECT policyname, cmd, permissive, qual, with_check
FROM pg_policies 
WHERE tablename = 'companies' 
AND schemaname = 'public'
ORDER BY policyname;

-- Drop the problematic catalog access policy that could expose company data
DROP POLICY IF EXISTS "companies_secure_catalog_access" ON public.companies;

-- Drop and recreate the company strict isolation policy with better security
DROP POLICY IF EXISTS "Company strict isolation" ON public.companies;

-- Create a new strict company isolation policy without public access loopholes
CREATE POLICY "companies_strict_isolation_secure" 
ON public.companies
FOR ALL
USING (
  -- Only allow authenticated users to see their own company OR admins
  (auth.uid() IS NOT NULL) AND 
  ((id = get_user_company_id()) OR is_admin_optimized())
)
WITH CHECK (
  -- Same restrictions for modifications - must be authenticated and own company or admin
  (auth.uid() IS NOT NULL) AND 
  ((id = get_user_company_id()) OR is_admin_optimized())
);

-- The "Allow company creation during signup" policy is acceptable for INSERT
-- The "Company admin can update own company" and "Company admin can view own company" are also secure

-- Verify the final policies are secure
SELECT policyname, cmd, permissive, quals.qual as using_expression, checks.qual as with_check_expression
FROM pg_policies 
LEFT JOIN (
  SELECT schemaname, tablename, policyname, qual 
  FROM pg_policies 
  WHERE cmd = 'ALL' OR cmd = 'SELECT' OR cmd = 'UPDATE' OR cmd = 'DELETE'
) quals ON pg_policies.policyname = quals.policyname
LEFT JOIN (
  SELECT schemaname, tablename, policyname, qual 
  FROM pg_policies 
  WHERE cmd = 'ALL' OR cmd = 'INSERT' OR cmd = 'UPDATE'
) checks ON pg_policies.policyname = checks.policyname
WHERE pg_policies.tablename = 'companies' 
AND pg_policies.schemaname = 'public'
ORDER BY pg_policies.policyname;