-- Drop the conflicting isolation policy that prevents anonymous token verification
DROP POLICY IF EXISTS "custom_auth_tokens_isolation" ON public.custom_auth_tokens;