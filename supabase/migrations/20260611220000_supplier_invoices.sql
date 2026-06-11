-- Factures d'achat (fournisseurs) synchronisées depuis Billit (arrivées via Peppol)
-- + matching avec les équipements de contrats + catégorisation IA (coûts de revient).
-- Exécutée via Management API (PAS supabase db push — historique migrations désync).

CREATE TABLE IF NOT EXISTS public.supplier_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  billit_order_id text NOT NULL,
  invoice_number text,
  doc_type text NOT NULL DEFAULT 'invoice', -- 'invoice' | 'credit_note'
  supplier_name text,
  supplier_vat text,
  invoice_date date,
  due_date date,
  paid_date date,
  amount_excl numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  amount_incl numeric NOT NULL DEFAULT 0,
  to_pay numeric NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT false,
  order_status text,        -- statut brut Billit: Paid / ToPay / ToDomiciliate...
  payment_method text,
  overdue boolean NOT NULL DEFAULT false,
  days_overdue integer,
  category text,            -- catégorie d'achat (compta BE), IA ou manuelle
  category_source text,     -- 'ai' | 'manual'
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  pdf_url text,
  billit_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_invoices_company_billit_uniq
  ON public.supplier_invoices(company_id, billit_order_id);
CREATE INDEX IF NOT EXISTS supplier_invoices_company_date_idx
  ON public.supplier_invoices(company_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS supplier_invoices_company_category_idx
  ON public.supplier_invoices(company_id, category);

ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS supplier_invoices_company_isolation ON public.supplier_invoices;
CREATE POLICY supplier_invoices_company_isolation ON public.supplier_invoices
  FOR ALL USING (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  )
  WITH CHECK (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  );

-- Suggestions de matching facture d'achat <-> équipement de contrat
CREATE TABLE IF NOT EXISTS public.supplier_invoice_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_invoice_id uuid NOT NULL REFERENCES public.supplier_invoices(id) ON DELETE CASCADE,
  contract_equipment_id uuid NOT NULL REFERENCES public.contract_equipment(id) ON DELETE CASCADE,
  line_index integer NOT NULL DEFAULT 0,
  line_description text,
  amount numeric,            -- prix unitaire HTVA de la ligne matchée
  score integer,             -- 0-100
  reason text,               -- explication (IA)
  status text NOT NULL DEFAULT 'suggested', -- 'suggested' | 'confirmed' | 'rejected'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sim_company_invoice_idx
  ON public.supplier_invoice_matches(company_id, supplier_invoice_id);
CREATE UNIQUE INDEX IF NOT EXISTS sim_invoice_line_equipment_uniq
  ON public.supplier_invoice_matches(supplier_invoice_id, line_index, contract_equipment_id);

ALTER TABLE public.supplier_invoice_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS supplier_invoice_matches_company_isolation ON public.supplier_invoice_matches;
CREATE POLICY supplier_invoice_matches_company_isolation ON public.supplier_invoice_matches
  FOR ALL USING (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  )
  WITH CHECK (
    (company_id = get_user_company_id()) OR is_admin_optimized()
  );

-- Cron quotidien 04:30 UTC : sync des achats Billit (statuts de paiement + nouvelles factures Peppol).
-- NB V1 mono-tenant : companyId iTakecare en dur (comme les crons Grenke).
SELECT cron.unschedule('billit-purchase-sync') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'billit-purchase-sync'
);
SELECT cron.schedule(
  'billit-purchase-sync',
  '30 4 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/billit-import-purchase-invoices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'apikey', '<SERVICE_ROLE_KEY>'
    ),
    body := jsonb_build_object('companyId', 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0', 'fromDate', '2026-01-01')
  );
  $cron$
);
