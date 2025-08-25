-- Critical Security Fix: Secure companies table from unauthorized access
-- Remove policies that could expose sensitive business data to competitors

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

-- Verify the final policies are secure (simplified query)
SELECT policyname, cmd, permissive
FROM pg_policies 
WHERE tablename = 'companies' 
AND schemaname = 'public'
ORDER BY policyname;