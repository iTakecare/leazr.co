
-- Drop orphaned policy on rate_limits table
-- The table intentionally has RLS disabled (it's a technical table used by edge functions),
-- but this policy was left behind and needs to be removed
DROP POLICY IF EXISTS "rate_limits_no_direct_access" ON public.rate_limits;

-- Add comment explaining why RLS is disabled
COMMENT ON TABLE public.rate_limits IS 'Technical table for rate limiting edge functions. RLS is intentionally disabled because access is controlled at the application layer via edge functions only.';
