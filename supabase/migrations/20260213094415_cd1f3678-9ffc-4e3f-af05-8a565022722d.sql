
-- Add order tracking fields to offer_equipment
ALTER TABLE public.offer_equipment
  ADD COLUMN IF NOT EXISTS order_status text NOT NULL DEFAULT 'to_order',
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id),
  ADD COLUMN IF NOT EXISTS supplier_price numeric,
  ADD COLUMN IF NOT EXISTS order_date timestamptz,
  ADD COLUMN IF NOT EXISTS order_reference text,
  ADD COLUMN IF NOT EXISTS reception_date timestamptz,
  ADD COLUMN IF NOT EXISTS order_notes text;

-- Add order tracking fields to contract_equipment
ALTER TABLE public.contract_equipment
  ADD COLUMN IF NOT EXISTS order_status text NOT NULL DEFAULT 'to_order',
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id),
  ADD COLUMN IF NOT EXISTS supplier_price numeric,
  ADD COLUMN IF NOT EXISTS order_date timestamptz,
  ADD COLUMN IF NOT EXISTS order_reference text,
  ADD COLUMN IF NOT EXISTS reception_date timestamptz,
  ADD COLUMN IF NOT EXISTS order_notes text;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_offer_equipment_order_status ON public.offer_equipment(order_status);
CREATE INDEX IF NOT EXISTS idx_contract_equipment_order_status ON public.contract_equipment(order_status);
CREATE INDEX IF NOT EXISTS idx_offer_equipment_supplier_id ON public.offer_equipment(supplier_id);
CREATE INDEX IF NOT EXISTS idx_contract_equipment_supplier_id ON public.contract_equipment(supplier_id);
