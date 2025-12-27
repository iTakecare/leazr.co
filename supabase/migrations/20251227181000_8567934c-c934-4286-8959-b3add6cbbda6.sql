-- Enable RLS on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for admin read access only
CREATE POLICY "Admins can view rate limits"
ON public.rate_limits
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Edge functions use service role key which bypasses RLS, so no INSERT/UPDATE policy needed for them
-- But we add admin write access for manual management if needed
CREATE POLICY "Admins can manage rate limits"
ON public.rate_limits
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));