-- Drop existing RLS policies on custom_auth_tokens if they exist
DROP POLICY IF EXISTS "Allow authenticated users to manage their own tokens" ON public.custom_auth_tokens;
DROP POLICY IF EXISTS "Allow token creation for account activation" ON public.custom_auth_tokens;
DROP POLICY IF EXISTS "Allow public token verification" ON public.custom_auth_tokens;

-- Create new RLS policy to allow anonymous reading of valid tokens for verification
CREATE POLICY "Allow anonymous token verification" 
ON public.custom_auth_tokens 
FOR SELECT 
USING (
  used_at IS NULL 
  AND expires_at > now()
);

-- Allow authenticated users to manage tokens from their company
CREATE POLICY "Allow company users to manage tokens" 
ON public.custom_auth_tokens 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND (
    company_id = get_user_company_id() 
    OR is_admin_optimized()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    company_id = get_user_company_id() 
    OR is_admin_optimized()
  )
);

-- Allow token creation during edge function execution (for account creation)
CREATE POLICY "Allow token creation for edge functions" 
ON public.custom_auth_tokens 
FOR INSERT 
WITH CHECK (true);