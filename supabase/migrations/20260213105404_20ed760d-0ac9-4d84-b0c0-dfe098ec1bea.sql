
-- Create equipment_order_units table for per-unit order tracking
CREATE TABLE public.equipment_order_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('offer', 'contract')),
  source_equipment_id UUID NOT NULL,
  unit_index INTEGER NOT NULL CHECK (unit_index > 0),
  order_status TEXT NOT NULL DEFAULT 'to_order' CHECK (order_status IN ('to_order', 'ordered', 'received', 'cancelled')),
  supplier_id UUID REFERENCES public.suppliers(id),
  supplier_price NUMERIC,
  order_date TIMESTAMPTZ,
  order_reference TEXT,
  reception_date TIMESTAMPTZ,
  order_notes TEXT,
  serial_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_unit_per_equipment UNIQUE (source_type, source_equipment_id, unit_index)
);

-- Indexes
CREATE INDEX idx_equipment_order_units_source ON public.equipment_order_units(source_type, source_equipment_id);
CREATE INDEX idx_equipment_order_units_status ON public.equipment_order_units(order_status);

-- Enable RLS
ALTER TABLE public.equipment_order_units ENABLE ROW LEVEL SECURITY;

-- RLS: access via company_id of parent offer/contract
-- Security definer function to check ownership
CREATE OR REPLACE FUNCTION public.check_equipment_unit_access(p_source_type TEXT, p_source_equipment_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM offer_equipment oe
    JOIN offers o ON o.id = oe.offer_id
    JOIN profiles p ON p.company_id = o.company_id
    WHERE oe.id = p_source_equipment_id
      AND p_source_type = 'offer'
      AND p.id = auth.uid()
    UNION ALL
    SELECT 1 FROM contract_equipment ce
    JOIN contracts c ON c.id = ce.contract_id
    JOIN profiles p ON p.company_id = c.company_id
    WHERE ce.id = p_source_equipment_id
      AND p_source_type = 'contract'
      AND p.id = auth.uid()
  )
$$;

CREATE POLICY "Users can view their company equipment units"
ON public.equipment_order_units
FOR SELECT
USING (public.check_equipment_unit_access(source_type, source_equipment_id));

CREATE POLICY "Users can insert their company equipment units"
ON public.equipment_order_units
FOR INSERT
WITH CHECK (public.check_equipment_unit_access(source_type, source_equipment_id));

CREATE POLICY "Users can update their company equipment units"
ON public.equipment_order_units
FOR UPDATE
USING (public.check_equipment_unit_access(source_type, source_equipment_id));

CREATE POLICY "Users can delete their company equipment units"
ON public.equipment_order_units
FOR DELETE
USING (public.check_equipment_unit_access(source_type, source_equipment_id));

-- Trigger for updated_at
CREATE TRIGGER update_equipment_order_units_updated_at
BEFORE UPDATE ON public.equipment_order_units
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
