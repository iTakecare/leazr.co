-- Multi-comptoirs iTakecare : fondation
-- Dimension "centre de coût / comptoir" (nullable, rétro-compatible).
-- Centrale = is_headquarters=true. Données existantes rattachées à la centrale.

CREATE TABLE IF NOT EXISTS public.cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  country text DEFAULT 'BE',     -- BE/FR/LU/NL/DE...
  currency text DEFAULT 'EUR',
  is_headquarters boolean NOT NULL DEFAULT false,
  parent_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cost_centers_company_idx ON public.cost_centers(company_id);
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cost_centers_company_isolation ON public.cost_centers;
CREATE POLICY cost_centers_company_isolation ON public.cost_centers
  FOR ALL USING ((company_id = get_user_company_id()) OR is_admin_optimized())
  WITH CHECK ((company_id = get_user_company_id()) OR is_admin_optimized());

-- Politique de remontée des données vers la centrale (data residency / RGPD par pays)
CREATE TABLE IF NOT EXISTS public.cost_center_sharing_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cost_center_id uuid NOT NULL REFERENCES public.cost_centers(id) ON DELETE CASCADE,
  share_financial_aggregates boolean NOT NULL DEFAULT true,  -- totaux CA/dépenses/marge
  share_invoice_detail boolean NOT NULL DEFAULT false,       -- lignes de factures
  share_client_data boolean NOT NULL DEFAULT false,          -- clients nominatifs
  share_hr_data boolean NOT NULL DEFAULT false,              -- RH / salaires
  share_accounting boolean NOT NULL DEFAULT true,            -- compta (Yuki agrégée)
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cost_center_id)
);
ALTER TABLE public.cost_center_sharing_policy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ccsp_company_isolation ON public.cost_center_sharing_policy;
CREATE POLICY ccsp_company_isolation ON public.cost_center_sharing_policy
  FOR ALL USING ((company_id = get_user_company_id()) OR is_admin_optimized())
  WITH CHECK ((company_id = get_user_company_id()) OR is_admin_optimized());

-- Dimension cost_center_id sur les données métier
ALTER TABLE public.contracts         ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL;
ALTER TABLE public.offers            ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL;
ALTER TABLE public.invoices          ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL;
ALTER TABLE public.supplier_invoices ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL;
ALTER TABLE public.clients           ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS contracts_cc_idx         ON public.contracts(cost_center_id);
CREATE INDEX IF NOT EXISTS offers_cc_idx            ON public.offers(cost_center_id);
CREATE INDEX IF NOT EXISTS invoices_cc_idx          ON public.invoices(cost_center_id);
CREATE INDEX IF NOT EXISTS supplier_invoices_cc_idx ON public.supplier_invoices(cost_center_id);
CREATE INDEX IF NOT EXISTS clients_cc_idx           ON public.clients(cost_center_id);

-- Seed : centrale iTakecare (Belgique) + politique (la centrale partage tout avec elle-même)
DO $$
DECLARE hq uuid;
DECLARE co uuid := 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';
BEGIN
  SELECT id INTO hq FROM public.cost_centers WHERE company_id = co AND is_headquarters LIMIT 1;
  IF hq IS NULL THEN
    INSERT INTO public.cost_centers (company_id, name, code, country, currency, is_headquarters)
    VALUES (co, 'iTakecare — Centrale (Belgique)', 'BE-HQ', 'BE', 'EUR', true)
    RETURNING id INTO hq;
    INSERT INTO public.cost_center_sharing_policy (company_id, cost_center_id, share_financial_aggregates, share_invoice_detail, share_client_data, share_hr_data, share_accounting)
    VALUES (co, hq, true, true, true, true, true);
  END IF;

  -- Rattacher les données existantes à la centrale
  UPDATE public.contracts         SET cost_center_id = hq WHERE company_id = co AND cost_center_id IS NULL;
  UPDATE public.offers            SET cost_center_id = hq WHERE company_id = co AND cost_center_id IS NULL;
  UPDATE public.invoices          SET cost_center_id = hq WHERE company_id = co AND cost_center_id IS NULL;
  UPDATE public.supplier_invoices SET cost_center_id = hq WHERE company_id = co AND cost_center_id IS NULL;
  UPDATE public.clients           SET cost_center_id = hq WHERE company_id = co AND cost_center_id IS NULL;
END $$;
