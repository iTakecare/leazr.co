-- Critical Security Fixes - RLS Policy Updates

-- 1. Secure platform_settings table - Admin only access
DROP POLICY IF EXISTS "Platform Settings Access" ON public.platform_settings;
CREATE POLICY "platform_settings_admin_only" 
ON public.platform_settings 
FOR ALL 
TO authenticated 
USING (is_saas_admin())
WITH CHECK (is_saas_admin());

-- 2. Secure permissions table - Admin only access  
DROP POLICY IF EXISTS "permissions_public_read" ON public.permissions;
CREATE POLICY "permissions_admin_only" 
ON public.permissions 
FOR ALL 
TO authenticated 
USING (is_saas_admin())
WITH CHECK (is_saas_admin());

-- 3. Secure permission_profiles table - Admin only access
DROP POLICY IF EXISTS "permission_profiles_public_read" ON public.permission_profiles;
CREATE POLICY "permission_profiles_admin_only" 
ON public.permission_profiles 
FOR ALL 
TO authenticated 
USING (is_saas_admin())
WITH CHECK (is_saas_admin());

-- 4. Secure site_settings table - Authenticated users only
DROP POLICY IF EXISTS "site_settings_public_read" ON public.site_settings;
CREATE POLICY "site_settings_authenticated_read" 
ON public.site_settings 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "site_settings_company_write" 
ON public.site_settings 
FOR ALL 
TO authenticated 
USING (company_id = get_user_company_id() OR is_saas_admin())
WITH CHECK (company_id = get_user_company_id() OR is_saas_admin());

-- 5. Secure pdf_models table - Company isolation
DROP POLICY IF EXISTS "pdf_models_public_read" ON public.pdf_models;
CREATE POLICY "pdf_models_company_isolation" 
ON public.pdf_models 
FOR ALL 
TO authenticated 
USING (company_id = get_user_company_id() OR is_saas_admin())
WITH CHECK (company_id = get_user_company_id() OR is_saas_admin());

-- 6. Fix remaining database function with search_path
CREATE OR REPLACE FUNCTION public.create_primary_collaborator_for_client(
  p_client_id uuid,
  p_client_name text,
  p_client_email text DEFAULT NULL::text,
  p_contact_name text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  collaborator_id uuid;
  collaborator_name text;
  collaborator_email text;
BEGIN
  -- Déterminer le nom du collaborateur principal
  collaborator_name := COALESCE(p_contact_name, p_client_name);
  collaborator_email := p_client_email;
  
  -- Créer le collaborateur principal
  INSERT INTO public.collaborators (
    client_id,
    name,
    email,
    role,
    is_primary
  ) VALUES (
    p_client_id,
    collaborator_name,
    collaborator_email,
    'Responsable principal',
    true
  ) RETURNING id INTO collaborator_id;
  
  RETURN collaborator_id;
END;
$$;