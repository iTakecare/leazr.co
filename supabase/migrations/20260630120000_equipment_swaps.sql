-- Trace des swaps d'appareils sur contrat (remplacement d'un appareil défectueux).
-- La ligne contract_equipment est mise à jour en place (nouvel appareil) ; cette
-- table conserve l'historique (ancien appareil, écart de prix, raison) et le lien
-- vers l'article stock créé pour l'ancien appareil revenu chez iTakecare.
CREATE TABLE IF NOT EXISTS public.equipment_swaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  contract_id uuid NOT NULL,
  contract_equipment_id uuid NOT NULL,
  offer_id uuid,
  old_title text NOT NULL,
  old_serial_number text,
  old_purchase_price numeric DEFAULT 0,
  new_title text NOT NULL,
  new_serial_number text,
  new_purchase_price numeric DEFAULT 0,
  price_delta numeric DEFAULT 0,
  reason text,
  returned_stock_item_id uuid,
  performed_by uuid,
  swapped_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_swaps_contract ON public.equipment_swaps(contract_id);
CREATE INDEX IF NOT EXISTS idx_equipment_swaps_equipment ON public.equipment_swaps(contract_equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_swaps_offer ON public.equipment_swaps(offer_id);
CREATE INDEX IF NOT EXISTS idx_equipment_swaps_company ON public.equipment_swaps(company_id);

ALTER TABLE public.equipment_swaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS equipment_swaps_company_select ON public.equipment_swaps;
CREATE POLICY equipment_swaps_company_select ON public.equipment_swaps
  FOR SELECT USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS equipment_swaps_company_write ON public.equipment_swaps;
CREATE POLICY equipment_swaps_company_write ON public.equipment_swaps
  FOR ALL USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());
