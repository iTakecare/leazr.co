-- Enable RLS on rate_limits table
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies needed - rate_limits is only accessed by Edge Functions with SERVICE_ROLE_KEY
-- No direct client access required
