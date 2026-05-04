-- =============================================
-- Stock item additional costs
--
-- Tracks costs incurred on a stock item AFTER its acquisition (repairs,
-- replacement parts, upgrades, shipping, etc.). The "real cost" of a
-- stock item is purchase_price + sum(stock_item_costs.amount).
--
-- Used to compute true margin when reselling or re-leasing reconditioned
-- equipment, especially items bought back from contracts.
-- =============================================

CREATE TABLE public.stock_item_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('repair', 'upgrade', 'part', 'shipping', 'other')),
  cost_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_item_costs_company ON public.stock_item_costs(company_id);
CREATE INDEX idx_stock_item_costs_stock_item ON public.stock_item_costs(stock_item_id);
CREATE INDEX idx_stock_item_costs_category ON public.stock_item_costs(category);

ALTER TABLE public.stock_item_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock item costs of their company"
  ON public.stock_item_costs FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert stock item costs for their company"
  ON public.stock_item_costs FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can update stock item costs of their company"
  ON public.stock_item_costs FOR UPDATE
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can delete stock item costs of their company"
  ON public.stock_item_costs FOR DELETE
  USING (company_id = public.get_user_company_id());

-- Auto-update updated_at on row update
CREATE OR REPLACE FUNCTION public.touch_stock_item_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_item_costs_updated_at
BEFORE UPDATE ON public.stock_item_costs
FOR EACH ROW EXECUTE FUNCTION public.touch_stock_item_costs_updated_at();
