-- =============================================
-- Stock buyback from contract (reprise matériel fin de contrat)
--
-- Permet de reprendre le matériel d'un contrat (fin anticipée ou normale)
-- en stock avec une valeur de rachat manuelle, et de tracer l'origine
-- (achat direct vs reprise contrat) sur le stock global.
-- =============================================

-- 1. stock_items : tracer l'origine + valeur de rachat + références contrat
ALTER TABLE public.stock_items
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'purchase',
  ADD COLUMN IF NOT EXISTS buyback_price NUMERIC,
  ADD COLUMN IF NOT EXISTS source_contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_contract_equipment_id UUID;

-- Contrainte de valeurs autorisées
ALTER TABLE public.stock_items
  DROP CONSTRAINT IF EXISTS stock_items_source_check;
ALTER TABLE public.stock_items
  ADD CONSTRAINT stock_items_source_check
  CHECK (source IN ('purchase', 'contract_buyback'));

CREATE INDEX IF NOT EXISTS idx_stock_items_source
  ON public.stock_items(source);
CREATE INDEX IF NOT EXISTS idx_stock_items_source_contract
  ON public.stock_items(source_contract_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_source_contract_equipment
  ON public.stock_items(source_contract_equipment_id);

-- 2. contract_equipment : marquer le matériel comme repris
ALTER TABLE public.contract_equipment
  ADD COLUMN IF NOT EXISTS bought_back_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bought_back_price NUMERIC;

CREATE INDEX IF NOT EXISTS idx_contract_equipment_bought_back_at
  ON public.contract_equipment(bought_back_at);
