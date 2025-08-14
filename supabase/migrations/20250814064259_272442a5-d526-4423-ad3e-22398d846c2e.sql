-- =============================================
-- CRITICAL SECURITY FIX: Secure exposed sensitive data
-- =============================================

-- 1. CUSTOM_AUTH_TOKENS - CRITICAL: Remove public access to auth tokens
-- Drop the dangerous public read policy
DROP POLICY IF EXISTS "Anonymous can read all tokens" ON public.custom_auth_tokens;

-- Create secure policy - only authenticated users from the same company can manage tokens
CREATE POLICY "Secure token access" ON public.custom_auth_tokens
FOR ALL 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    company_id = get_user_company_id() OR 
    is_admin_optimized()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    company_id = get_user_company_id() OR 
    is_admin_optimized()
  )
);

-- 2. PDF_MODEL_IMAGES - CRITICAL: Remove public access to business documents  
-- Drop the dangerous public read policy
DROP POLICY IF EXISTS "Public read pdf_model_images" ON public.pdf_model_images;

-- Create secure policy - only authenticated admins can access business documents
CREATE POLICY "Secure pdf model images access" ON public.pdf_model_images
FOR ALL
TO authenticated  
USING (
  auth.uid() IS NOT NULL AND (
    is_admin_optimized() OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_admin_optimized() OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')  
    )
  )
);

-- 3. SITE_SETTINGS - HIGH RISK: Remove public write access
-- Drop the dangerous policy that allows anyone to write
DROP POLICY IF EXISTS "Allow all access to site_settings" ON public.site_settings;

-- Create secure read policy for public content that needs to be accessible
CREATE POLICY "Public read site_settings" ON public.site_settings
FOR SELECT
TO public
USING (true);

-- Create secure write policy - only authenticated admins can modify
CREATE POLICY "Admin write site_settings" ON public.site_settings  
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    is_admin_optimized() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_admin_optimized() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
);

-- 4. PLATFORM_SETTINGS - Restrict to SaaS admin only
-- The existing policies are actually good - only is_saas_admin() can write
-- But let's make the read policy more restrictive
DROP POLICY IF EXISTS "platform_settings_public_read" ON public.platform_settings;

-- Only allow authenticated users to read platform settings
CREATE POLICY "platform_settings_auth_read" ON public.platform_settings
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 5. POSTAL_CODES - This can remain public as postal codes are generally public data
-- Keep existing policies as postal codes are typically public information
-- But let's add a comment for clarity
COMMENT ON TABLE public.postal_codes IS 'Postal codes data - kept public as this is generally public information';

-- Create audit log of this security fix
INSERT INTO public.admin_pending_requests (
  user_id,
  client_name, 
  status,
  equipment_description,
  created_at,
  updated_at
) VALUES (
  auth.uid(),
  'SECURITY_FIX',
  'completed', 
  'Applied critical security patches: Secured custom_auth_tokens, pdf_model_images, site_settings, and platform_settings tables',
  now(),
  now()
);