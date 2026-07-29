-- WINLEASE PHASE 2 : scoring & décision financeur
-- - credit_reports : snapshots des rapports de solvabilité (Graydon/Creditsafe)
-- - limites d'encours par client final et par partenaire apporteur
-- - recommandation IA persistée sur l'offre
-- - RPC get_financing_exposure : encours accepté (offres non mortes de type financing_request)

-- 1. Snapshots de rapports de crédit
CREATE TABLE IF NOT EXISTS public.credit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'creditsafe',
  connect_id text,
  company_name text,
  vat_number text,
  credit_score text,
  credit_limit numeric,
  rating_description text,
  payload jsonb,
  fetched_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_reports_company ON public.credit_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_credit_reports_client ON public.credit_reports(client_id);
CREATE INDEX IF NOT EXISTS idx_credit_reports_offer ON public.credit_reports(offer_id);

ALTER TABLE public.credit_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS credit_reports_company_all ON public.credit_reports;
CREATE POLICY credit_reports_company_all ON public.credit_reports
  FOR ALL USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

-- Blocage clients + partenaires (données internes d'analyse)
DROP POLICY IF EXISTS zzz_block_clients ON public.credit_reports;
CREATE POLICY zzz_block_clients ON public.credit_reports AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT public.is_client_user());
DROP POLICY IF EXISTS zzz_block_financing_partners ON public.credit_reports;
CREATE POLICY zzz_block_financing_partners ON public.credit_reports AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT public.is_financing_partner_user());

-- 2. Limites d'encours
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS outstanding_limit numeric;
ALTER TABLE public.financing_partners ADD COLUMN IF NOT EXISTS outstanding_limit numeric;
COMMENT ON COLUMN public.clients.outstanding_limit IS 'Encours de financement maximum autorisé pour ce client final (montant cumulé accepté, en €)';
COMMENT ON COLUMN public.financing_partners.outstanding_limit IS 'Encours de financement maximum autorisé via ce partenaire/broker (montant cumulé accepté, en €)';

-- 3. Recommandation IA persistée sur l'offre
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS financing_ai_recommendation jsonb;

-- 4. Encours de financement (offres financing_request acceptées/actives, hors mortes)
CREATE OR REPLACE FUNCTION public.get_financing_exposure(
  p_client_id uuid DEFAULT NULL,
  p_partner_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_company_id uuid := public.get_user_company_id();
  v_client_amount numeric := 0;
  v_client_count integer := 0;
  v_partner_amount numeric := 0;
  v_partner_count integer := 0;
  -- Statuts considérés comme engageant l'encours (accepté ou plus loin)
  v_accepted text[] := ARRAY[
    'internal_approved','leaser_approved','approved','accepted',
    'validated','financed','contract_signed','invoicing'
  ];
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur sans société';
  END IF;

  IF p_client_id IS NOT NULL THEN
    SELECT COALESCE(SUM(o.amount), 0), COUNT(*)
    INTO v_client_amount, v_client_count
    FROM offers o
    WHERE o.company_id = v_company_id
      AND o.client_id = p_client_id
      AND o.type = 'financing_request'
      AND o.workflow_status = ANY(v_accepted);
  END IF;

  IF p_partner_id IS NOT NULL THEN
    SELECT COALESCE(SUM(o.amount), 0), COUNT(*)
    INTO v_partner_amount, v_partner_count
    FROM offers o
    WHERE o.company_id = v_company_id
      AND o.financing_partner_id = p_partner_id
      AND o.type = 'financing_request'
      AND o.workflow_status = ANY(v_accepted);
  END IF;

  RETURN jsonb_build_object(
    'client_outstanding', v_client_amount,
    'client_accepted_count', v_client_count,
    'partner_outstanding', v_partner_amount,
    'partner_accepted_count', v_partner_count
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_financing_exposure(uuid, uuid) TO authenticated;
