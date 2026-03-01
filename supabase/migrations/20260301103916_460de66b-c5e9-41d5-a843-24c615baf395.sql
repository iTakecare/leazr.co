
-- =============================================
-- STOCK MANAGEMENT TABLES
-- =============================================

-- 1. stock_items : article physique unique
CREATE TABLE public.stock_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  serial_number TEXT,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_stock',
  condition TEXT NOT NULL DEFAULT 'new',
  purchase_price NUMERIC DEFAULT 0,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  order_reference TEXT,
  purchase_date DATE,
  reception_date DATE,
  current_contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  current_contract_equipment_id UUID,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. stock_movements : historique des mouvements
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  related_stock_item_id UUID REFERENCES public.stock_items(id) ON DELETE SET NULL,
  cost NUMERIC,
  notes TEXT,
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. stock_repairs : suivi des réparations
CREATE TABLE public.stock_repairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  repair_cost NUMERIC DEFAULT 0,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at DATE,
  result_condition TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_stock_items_company_id ON public.stock_items(company_id);
CREATE INDEX idx_stock_items_status ON public.stock_items(status);
CREATE INDEX idx_stock_items_serial_number ON public.stock_items(serial_number);
CREATE INDEX idx_stock_items_current_contract ON public.stock_items(current_contract_id);
CREATE INDEX idx_stock_items_product ON public.stock_items(product_id);
CREATE INDEX idx_stock_items_supplier ON public.stock_items(supplier_id);

CREATE INDEX idx_stock_movements_company_id ON public.stock_movements(company_id);
CREATE INDEX idx_stock_movements_stock_item ON public.stock_movements(stock_item_id);
CREATE INDEX idx_stock_movements_contract ON public.stock_movements(contract_id);

CREATE INDEX idx_stock_repairs_company_id ON public.stock_repairs(company_id);
CREATE INDEX idx_stock_repairs_stock_item ON public.stock_repairs(stock_item_id);
CREATE INDEX idx_stock_repairs_status ON public.stock_repairs(status);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Helper function to get company_id for current user
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- stock_items
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock items of their company"
  ON public.stock_items FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert stock items for their company"
  ON public.stock_items FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can update stock items of their company"
  ON public.stock_items FOR UPDATE
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can delete stock items of their company"
  ON public.stock_items FOR DELETE
  USING (company_id = public.get_user_company_id());

-- stock_movements
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock movements of their company"
  ON public.stock_movements FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert stock movements for their company"
  ON public.stock_movements FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

-- stock_repairs
ALTER TABLE public.stock_repairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock repairs of their company"
  ON public.stock_repairs FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert stock repairs for their company"
  ON public.stock_repairs FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can update stock repairs of their company"
  ON public.stock_repairs FOR UPDATE
  USING (company_id = public.get_user_company_id());

-- =============================================
-- TRIGGERS for updated_at
-- =============================================
CREATE TRIGGER update_stock_items_updated_at
  BEFORE UPDATE ON public.stock_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stock_repairs_updated_at
  BEFORE UPDATE ON public.stock_repairs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
