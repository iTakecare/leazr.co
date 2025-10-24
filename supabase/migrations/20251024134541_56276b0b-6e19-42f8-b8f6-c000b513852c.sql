-- Create rate_limits table for rate limiting edge functions
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint 
ON rate_limits(identifier, endpoint, window_start DESC);

-- Function to cleanup old rate limit entries (> 2 hours)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM rate_limits 
  WHERE window_start < NOW() - INTERVAL '2 hours';
END;
$$;

-- Optional: Schedule automatic cleanup (can be triggered by cron or manually)
COMMENT ON FUNCTION cleanup_old_rate_limits() IS 'Nettoie les entrées de rate_limits plus anciennes que 2 heures';
