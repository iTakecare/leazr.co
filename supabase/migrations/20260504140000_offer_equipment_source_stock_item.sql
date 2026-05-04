-- =============================================
-- Allow offer equipment to reference a stock item
--
-- When an offer is composed by picking from existing stock (ex. equipment
-- bought back from a previous contract), trace the link so we can:
--  1. Pre-fill price / serial number from the stock item
--  2. Reserve the stock item while the offer is in flight
--  3. Reassign the stock item to the new contract on signature
-- =============================================

ALTER TABLE public.offer_equipment
  ADD COLUMN IF NOT EXISTS source_stock_item_id UUID
  REFERENCES public.stock_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_offer_equipment_source_stock_item
  ON public.offer_equipment(source_stock_item_id);
