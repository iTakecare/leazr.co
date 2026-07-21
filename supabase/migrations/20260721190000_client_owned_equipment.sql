-- Matériel du client acheté HORS iTakecare (parc externe).
-- Le client le déclare dans son espace (date d'achat incluse) ; l'âge vs la durée
-- d'amortissement permet de détecter les opportunités de renouvellement/leasing.

CREATE TABLE IF NOT EXISTS public.client_owned_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  brand text,
  category text NOT NULL DEFAULT 'other',
  serial_number text,
  purchase_date date,
  purchase_price numeric,
  supplier text,
  amortization_years integer NOT NULL DEFAULT 3,
  condition text NOT NULL DEFAULT 'good' CHECK (condition IN ('good', 'average', 'defective')),
  collaborator_id uuid REFERENCES public.collaborators(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_owned_equipment_client ON public.client_owned_equipment(client_id);
CREATE INDEX IF NOT EXISTS idx_client_owned_equipment_company_date ON public.client_owned_equipment(company_id, purchase_date);

ALTER TABLE public.client_owned_equipment ENABLE ROW LEVEL SECURITY;

-- Même modèle d'accès que collaborators : le client gère son propre parc,
-- les membres de la société (non-clients) et les admins y accèdent aussi
-- (c'est la source des opportunités de renouvellement côté iTakecare).
DROP POLICY IF EXISTS client_owned_equipment_access ON public.client_owned_equipment;
CREATE POLICY client_owned_equipment_access ON public.client_owned_equipment
  FOR ALL
  USING (
    (client_id IN (SELECT auth_client_ids()))
    OR ((company_id = get_user_company_id()) AND (NOT is_client_user()))
    OR is_admin_optimized()
  )
  WITH CHECK (
    (client_id IN (SELECT auth_client_ids()))
    OR ((company_id = get_user_company_id()) AND (NOT is_client_user()))
    OR is_admin_optimized()
  );

CREATE OR REPLACE FUNCTION public.update_client_owned_equipment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_client_owned_equipment_updated_at ON public.client_owned_equipment;
CREATE TRIGGER trg_client_owned_equipment_updated_at
  BEFORE UPDATE ON public.client_owned_equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_owned_equipment_updated_at();
