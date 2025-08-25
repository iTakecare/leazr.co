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

-- 3. Drop existing policies and create secure ones

-- Products table - drop existing and create new secure policy
DROP POLICY IF EXISTS "products_company_isolation" ON public.products;
DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_company_isolation_secure" ON public.products
  FOR ALL USING (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  )
  WITH CHECK (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  );

-- Leasers table - drop existing and create secure policy  
DROP POLICY IF EXISTS "leasers_company_isolation" ON public.leasers;
DROP POLICY IF EXISTS "leasers_public_read" ON public.leasers;
CREATE POLICY "leasers_company_isolation_secure" ON public.leasers
  FOR ALL USING (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  )
  WITH CHECK (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  );

-- Invoices table - drop existing and create secure policy
DROP POLICY IF EXISTS "invoices_company_isolation" ON public.invoices;
DROP POLICY IF EXISTS "invoices_public_read" ON public.invoices;
CREATE POLICY "invoices_company_isolation_secure" ON public.invoices
  FOR ALL USING (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  )
  WITH CHECK (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  );