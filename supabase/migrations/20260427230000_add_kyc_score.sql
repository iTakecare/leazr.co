BEGIN;

-- Score KYC interne (façon CompanyWeb : A/B/C/D + raisons calculées).
-- Recomputé à chaque validation d'un rapport KYC.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS kyc_score text,
  ADD COLUMN IF NOT EXISTS kyc_score_reasons jsonb,
  ADD COLUMN IF NOT EXISTS kyc_score_computed_at timestamptz;

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_kyc_score_check;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_kyc_score_check
  CHECK (
    kyc_score IS NULL
    OR kyc_score IN ('A', 'B', 'C', 'D')
  );

COMMENT ON COLUMN public.clients.kyc_score IS
  'Score KYC interne (A/B/C/D). A = société établie sans alerte ; B = 1-3 ans, actif ; C = jeune entreprise ou indicateurs faibles ; D = alertes BCE (faillite, liquidation, radiation) ou indicateurs très négatifs.';
COMMENT ON COLUMN public.clients.kyc_score_reasons IS
  'Tableau JSON des raisons qui ont conduit au score (ex: ["Société de 6 mois (< 12)", "Résultat net négatif"]).';

CREATE INDEX IF NOT EXISTS idx_clients_kyc_score
  ON public.clients (company_id, kyc_score)
  WHERE kyc_score IS NOT NULL;

COMMIT;
