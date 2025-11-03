-- Fix critical security issue: Enable RLS on rate_limits table
-- This prevents unauthorized manipulation of rate limiting data

-- Enable Row Level Security on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy to block all direct access
-- The SECURITY DEFINER function increment_rate_limit will bypass RLS
-- and handle all rate limit operations securely
CREATE POLICY "rate_limits_no_direct_access"
ON public.rate_limits
FOR ALL
USING (false)
WITH CHECK (false);

-- Add comment explaining the security model
COMMENT ON TABLE public.rate_limits IS 'Rate limiting data. Direct access blocked by RLS. All operations must go through increment_rate_limit() function.';