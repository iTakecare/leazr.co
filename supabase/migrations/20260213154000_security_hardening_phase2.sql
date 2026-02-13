-- Security hardening phase 2
-- Goal: remove direct anonymous writes on custom_auth_tokens.
-- Token lifecycle is managed by Edge Functions (service role) and SECURITY DEFINER RPC.

-- Remove known anonymous insert policies that were introduced by older migrations
DROP POLICY IF EXISTS "custom_auth_tokens_validated_insert" ON public.custom_auth_tokens;
DROP POLICY IF EXISTS "custom_auth_tokens_edge_insert" ON public.custom_auth_tokens;
DROP POLICY IF EXISTS "Allow token creation for edge functions" ON public.custom_auth_tokens;

-- Remove known overly permissive anonymous read policy variants
DROP POLICY IF EXISTS "Anonymous can read all tokens" ON public.custom_auth_tokens;
DROP POLICY IF EXISTS "Allow anonymous token verification" ON public.custom_auth_tokens;
DROP POLICY IF EXISTS "Allow public token verification" ON public.custom_auth_tokens;

-- Keep table access only for authenticated users through existing secure policies
-- and for Edge Functions via service-role key (bypasses RLS).
REVOKE INSERT, UPDATE, DELETE ON public.custom_auth_tokens FROM anon;
REVOKE SELECT ON public.custom_auth_tokens FROM anon;

COMMENT ON TABLE public.custom_auth_tokens IS
  'Custom auth token storage. Direct anonymous table access is blocked; use Edge Functions or SECURITY DEFINER RPC only.';
