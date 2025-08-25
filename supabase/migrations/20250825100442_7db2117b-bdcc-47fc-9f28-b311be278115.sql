-- CONTINUE SECURITY FIX: Complete the remaining table security fixes

-- Drop any remaining public access policies and secure remaining sensitive tables

-- Partner commissions table - secure it
DROP POLICY IF EXISTS "partner_commissions_company_isolation" ON public.partner_commissions;
DROP POLICY IF EXISTS "partner_commissions_public_read" ON public.partner_commissions;
CREATE POLICY "partner_commissions_company_isolation_secure" ON public.partner_commissions
  FOR ALL USING (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  )
  WITH CHECK (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  );

-- Custom auth tokens table - secure access to token owner or admin
DROP POLICY IF EXISTS "custom_auth_tokens_secure_access" ON public.custom_auth_tokens;
DROP POLICY IF EXISTS "custom_auth_tokens_public_read" ON public.custom_auth_tokens;
CREATE POLICY "custom_auth_tokens_secure_access" ON public.custom_auth_tokens
  FOR ALL USING (
    (user_id = auth.uid()) OR is_admin_optimized()
  )
  WITH CHECK (
    (user_id = auth.uid()) OR is_admin_optimized()
  );

-- Email templates table - company isolation
DROP POLICY IF EXISTS "email_templates_company_isolation" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_public_read" ON public.email_templates;
CREATE POLICY "email_templates_company_isolation_secure" ON public.email_templates
  FOR ALL USING (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  )
  WITH CHECK (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  );

-- SMTP settings table - company isolation
DROP POLICY IF EXISTS "smtp_settings_company_isolation" ON public.smtp_settings;
DROP POLICY IF EXISTS "smtp_settings_public_read" ON public.smtp_settings;
CREATE POLICY "smtp_settings_company_isolation_secure" ON public.smtp_settings
  FOR ALL USING (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  )
  WITH CHECK (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  );

-- Fix infinite recursion in offers table by removing ALL conflicting policies
DROP POLICY IF EXISTS "offers_admin_full_access" ON public.offers;
DROP POLICY IF EXISTS "offers_company_read_access" ON public.offers;
DROP POLICY IF EXISTS "offers_user_access" ON public.offers;
DROP POLICY IF EXISTS "offers_secure_access" ON public.offers;
DROP POLICY IF EXISTS "offers_company_isolation_secure" ON public.offers;

-- Create single, clean offers policy
CREATE POLICY "offers_final_company_isolation" ON public.offers
  FOR ALL USING (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  )
  WITH CHECK (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  );

-- Fix infinite recursion in offer_upload_links by cleaning up ALL policies  
DROP POLICY IF EXISTS "offer_upload_links_admin_access" ON public.offer_upload_links;
DROP POLICY IF EXISTS "offer_upload_links_company_access" ON public.offer_upload_links;
DROP POLICY IF EXISTS "offer_upload_links_user_access" ON public.offer_upload_links;
DROP POLICY IF EXISTS "offer_upload_links_secure_access" ON public.offer_upload_links;

-- Create clean offer_upload_links policy
CREATE POLICY "offer_upload_links_final_secure" ON public.offer_upload_links
  FOR ALL USING (
    (offer_id IN (
      SELECT id FROM public.offers 
      WHERE company_id = get_user_company_id()
    )) OR is_admin_optimized()
  )
  WITH CHECK (
    (offer_id IN (
      SELECT id FROM public.offers 
      WHERE company_id = get_user_company_id()
    )) OR is_admin_optimized()
  );