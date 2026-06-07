-- Defense-in-depth: grenke_submissions previously had RLS DISABLED, relying
-- solely on the edge function (service role) to enforce the company check.
-- With RLS off, any role holding a table GRANT could read every tenant's rows.
-- The service role bypasses RLS, so enabling it does NOT affect the existing
-- edge-function read/write path; it only closes direct cross-tenant access.

ALTER TABLE public.grenke_submissions ENABLE ROW LEVEL SECURITY;

-- Authenticated users may read only their own company's submission history.
-- (Writes continue to happen exclusively through the service-role edge function.)
DROP POLICY IF EXISTS grenke_submissions_company_read ON public.grenke_submissions;
CREATE POLICY grenke_submissions_company_read
  ON public.grenke_submissions
  FOR SELECT
  TO authenticated
  USING (company_id = public.get_user_company_id());
