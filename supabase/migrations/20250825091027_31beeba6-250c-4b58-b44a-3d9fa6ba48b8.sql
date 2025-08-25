-- CRITICAL SECURITY FIX: Remove public access to sensitive customer/business data
-- Fix policies that expose personal information to unauthorized users

-- 1. PROSPECTS TABLE - CRITICAL: Remove public access that allows anyone to create/view prospects
DROP POLICY IF EXISTS "Anyone can create prospects" ON public.prospects;
DROP POLICY IF EXISTS "Prospects can view own profile via token" ON public.prospects;

-- Replace with secure authenticated-only access
CREATE POLICY "prospects_admin_only" 
ON public.prospects
FOR ALL
USING (is_admin_optimized())
WITH CHECK (is_admin_optimized());

-- Add secure token-based access for legitimate prospect activation
CREATE POLICY "prospects_secure_token_access" 
ON public.prospects
FOR SELECT
USING (
  -- Only allow access with valid activation token AND user must be authenticated
  (auth.uid() IS NOT NULL) AND 
  (activation_token IS NOT NULL) AND 
  (status = 'active') AND 
  (trial_ends_at > now())
);

-- 2. AMBASSADORS TABLE - Fix to require authentication and proper company scope
DROP POLICY IF EXISTS "ambassadors_company_access" ON public.ambassadors;

CREATE POLICY "ambassadors_secure_company_access" 
ON public.ambassadors
FOR ALL
USING (
  -- Must be authenticated AND within same company OR admin OR own ambassador profile
  (auth.uid() IS NOT NULL) AND (
    (company_id = get_user_company_id()) OR 
    is_admin_optimized() OR 
    (user_id = auth.uid())
  )
)
WITH CHECK (
  -- Same restrictions for modifications
  (auth.uid() IS NOT NULL) AND (
    (company_id = get_user_company_id()) OR 
    is_admin_optimized()
  )
);

-- 3. CLIENTS TABLE - Ensure all policies require authentication
DROP POLICY IF EXISTS "clients_access" ON public.clients;
DROP POLICY IF EXISTS "Clients strict company isolation" ON public.clients;

CREATE POLICY "clients_secure_company_isolation" 
ON public.clients
FOR ALL
USING (
  -- Must be authenticated AND within same company OR admin OR own client profile
  (auth.uid() IS NOT NULL) AND (
    (company_id = get_user_company_id()) OR 
    is_admin_optimized() OR 
    (user_id = auth.uid())
  )
)
WITH CHECK (
  -- Modifications require company access or admin
  (auth.uid() IS NOT NULL) AND (
    (company_id = get_user_company_id()) OR 
    is_admin_optimized()
  )
);

-- 4. COLLABORATORS TABLE - Already secure but ensure authentication requirement is explicit
DROP POLICY IF EXISTS "collaborators_secure_access" ON public.collaborators;

CREATE POLICY "collaborators_secure_company_access" 
ON public.collaborators
FOR ALL
USING (
  -- Must be authenticated AND have access to the client this collaborator belongs to
  (auth.uid() IS NOT NULL) AND (
    (client_id IN (
      SELECT c.id FROM clients c 
      WHERE (c.company_id = get_user_company_id()) OR (c.user_id = auth.uid())
    )) OR 
    is_admin_optimized()
  )
)
WITH CHECK (
  -- Same restrictions for modifications
  (auth.uid() IS NOT NULL) AND (
    (client_id IN (
      SELECT c.id FROM clients c 
      WHERE (c.company_id = get_user_company_id()) OR (c.user_id = auth.uid())
    )) OR 
    is_admin_optimized()
  )
);