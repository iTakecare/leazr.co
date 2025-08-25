-- COMPREHENSIVE SECURITY FIX: Remove public access and implement proper company isolation

-- 1. First, drop any existing problematic policies that allow public access
DROP POLICY IF EXISTS "Enable read access for all users" ON public.clients;
DROP POLICY IF EXISTS "Public read access" ON public.clients;
DROP POLICY IF EXISTS "Allow public read" ON public.clients;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.ambassadors;
DROP POLICY IF EXISTS "Public read access" ON public.ambassadors;
DROP POLICY IF EXISTS "Allow public read" ON public.ambassadors;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.offers;
DROP POLICY IF EXISTS "Public read access" ON public.offers;
DROP POLICY IF EXISTS "Allow public read" ON public.offers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.contracts;
DROP POLICY IF EXISTS "Public read access" ON public.contracts;
DROP POLICY IF EXISTS "Allow public read" ON public.contracts;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
DROP POLICY IF EXISTS "Public read access" ON public.products;
DROP POLICY IF EXISTS "Allow public read" ON public.products;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.leasers;
DROP POLICY IF EXISTS "Public read access" ON public.leasers;
DROP POLICY IF EXISTS "Allow public read" ON public.leasers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.invoices;
DROP POLICY IF EXISTS "Public read access" ON public.invoices;
DROP POLICY IF EXISTS "Allow public read" ON public.invoices;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.partner_commissions;
DROP POLICY IF EXISTS "Public read access" ON public.partner_commissions;
DROP POLICY IF EXISTS "Allow public read" ON public.partner_commissions;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.admin_pending_requests;
DROP POLICY IF EXISTS "Public read access" ON public.admin_pending_requests;
DROP POLICY IF EXISTS "Allow public read" ON public.admin_pending_requests;

-- 2. Ensure RLS is enabled on all sensitive tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leasers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_pending_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;

-- 3. Create secure policies for tables that might not have proper ones

-- Products table - company isolation
CREATE POLICY IF NOT EXISTS "products_company_isolation" ON public.products
  FOR ALL USING (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  )
  WITH CHECK (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  );

-- Leasers table - company isolation  
CREATE POLICY IF NOT EXISTS "leasers_company_isolation" ON public.leasers
  FOR ALL USING (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  )
  WITH CHECK (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  );

-- Invoices table - company isolation
CREATE POLICY IF NOT EXISTS "invoices_company_isolation" ON public.invoices
  FOR ALL USING (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  )
  WITH CHECK (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  );

-- Partner commissions table - company isolation
CREATE POLICY IF NOT EXISTS "partner_commissions_company_isolation" ON public.partner_commissions
  FOR ALL USING (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  )
  WITH CHECK (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  );

-- Custom auth tokens - restrict to token owner or admin
CREATE POLICY IF NOT EXISTS "custom_auth_tokens_secure_access" ON public.custom_auth_tokens
  FOR ALL USING (
    (user_id = auth.uid()) OR is_admin_optimized()
  )
  WITH CHECK (
    (user_id = auth.uid()) OR is_admin_optimized()
  );

-- Email templates - company isolation
CREATE POLICY IF NOT EXISTS "email_templates_company_isolation" ON public.email_templates
  FOR ALL USING (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  )
  WITH CHECK (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  );

-- SMTP settings - company isolation
CREATE POLICY IF NOT EXISTS "smtp_settings_company_isolation" ON public.smtp_settings
  FOR ALL USING (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  )
  WITH CHECK (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  );

-- 4. Fix infinite recursion in offers table by removing problematic policies
DROP POLICY IF EXISTS "offers_admin_full_access" ON public.offers;
DROP POLICY IF EXISTS "offers_company_read_access" ON public.offers;
DROP POLICY IF EXISTS "offers_user_access" ON public.offers;
DROP POLICY IF EXISTS "offers_secure_access" ON public.offers;

-- Create single, clean offers policy
CREATE POLICY "offers_company_isolation_secure" ON public.offers
  FOR ALL USING (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  )
  WITH CHECK (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  );

-- 5. Fix infinite recursion in offer_upload_links by cleaning up policies  
DROP POLICY IF EXISTS "offer_upload_links_admin_access" ON public.offer_upload_links;
DROP POLICY IF EXISTS "offer_upload_links_company_access" ON public.offer_upload_links;
DROP POLICY IF EXISTS "offer_upload_links_user_access" ON public.offer_upload_links;

-- Create clean offer_upload_links policy
CREATE POLICY "offer_upload_links_secure_access" ON public.offer_upload_links
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

-- 6. Ensure contracts table has proper isolation
DROP POLICY IF EXISTS "contracts_public_read" ON public.contracts;
DROP POLICY IF EXISTS "contracts_user_access" ON public.contracts;

CREATE POLICY IF NOT EXISTS "contracts_company_isolation_secure" ON public.contracts
  FOR ALL USING (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  )
  WITH CHECK (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  );