-- Fix: Disable RLS on rate_limits table
-- This is infrastructure data accessed by edge functions with service role key
-- RLS is not needed as access is controlled through service role permissions

ALTER TABLE public.rate_limits DISABLE ROW LEVEL SECURITY;

-- Add comment explaining why RLS is disabled
COMMENT ON TABLE public.rate_limits IS 'Infrastructure table for rate limiting. RLS disabled as access is controlled through service role key in edge functions.';