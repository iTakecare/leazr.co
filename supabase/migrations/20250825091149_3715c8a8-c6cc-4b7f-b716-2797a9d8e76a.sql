-- CRITICAL FIX: Change policies from {public} to {authenticated} roles
-- The issue is policies apply to unauthenticated users even with auth checks

-- 1. AMBASSADORS - Fix role restriction
DROP POLICY IF EXISTS "ambassadors_secure_company_access" ON public.ambassadors;

CREATE POLICY "ambassadors_secure_company_access" 
ON public.ambassadors
FOR ALL
TO authenticated  -- CRITICAL: Only apply to authenticated users
USING (
  -- Within same company OR admin OR own ambassador profile
  (company_id = get_user_company_id()) OR 
  is_admin_optimized() OR 
  (user_id = auth.uid())
)
WITH CHECK (
  -- Modifications require company access or admin
  (company_id = get_user_company_id()) OR 
  is_admin_optimized()
);

-- 2. CLIENTS - Fix role restriction  
DROP POLICY IF EXISTS "clients_secure_company_isolation" ON public.clients;

CREATE POLICY "clients_secure_company_isolation" 
ON public.clients
FOR ALL
TO authenticated  -- CRITICAL: Only apply to authenticated users
USING (
  -- Within same company OR admin OR own client profile
  (company_id = get_user_company_id()) OR 
  is_admin_optimized() OR 
  (user_id = auth.uid())
)
WITH CHECK (
  -- Modifications require company access or admin
  (company_id = get_user_company_id()) OR 
  is_admin_optimized()
);

-- 3. COLLABORATORS - Fix role restriction
DROP POLICY IF EXISTS "collaborators_secure_company_access" ON public.collaborators;

CREATE POLICY "collaborators_secure_company_access" 
ON public.collaborators
FOR ALL
TO authenticated  -- CRITICAL: Only apply to authenticated users
USING (
  -- Have access to the client this collaborator belongs to
  (client_id IN (
    SELECT c.id FROM clients c 
    WHERE (c.company_id = get_user_company_id()) OR (c.user_id = auth.uid())
  )) OR 
  is_admin_optimized()
)
WITH CHECK (
  -- Same restrictions for modifications
  (client_id IN (
    SELECT c.id FROM clients c 
    WHERE (c.company_id = get_user_company_id()) OR (c.user_id = auth.uid())
  )) OR 
  is_admin_optimized()
);

-- 4. PROSPECTS - Fix role restriction and clean up duplicate policies
DROP POLICY IF EXISTS "Admins can manage all prospects" ON public.prospects;
DROP POLICY IF EXISTS "prospects_admin_only" ON public.prospects;
DROP POLICY IF EXISTS "prospects_secure_token_access" ON public.prospects;

-- Admin-only access for prospects management
CREATE POLICY "prospects_admin_only" 
ON public.prospects
FOR ALL
TO authenticated  -- CRITICAL: Only apply to authenticated users
USING (is_admin_optimized())
WITH CHECK (is_admin_optimized());

-- Secure token-based access for prospect activation (must be authenticated)
CREATE POLICY "prospects_secure_token_access" 
ON public.prospects
FOR SELECT
TO authenticated  -- CRITICAL: Only apply to authenticated users  
USING (
  -- Valid activation token with time limits
  (activation_token IS NOT NULL) AND 
  (status = 'active') AND 
  (trial_ends_at > now())
);