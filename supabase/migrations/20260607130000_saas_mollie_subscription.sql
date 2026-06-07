-- SaaS billing via Mollie (abonnement Leazr → entreprises clientes).
-- Ajoute les colonnes Mollie au niveau COMPANY (jusqu'ici les colonnes mollie_*
-- n'existaient que sur contracts, pour la collecte leasing — facturation B).

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS mollie_customer_id     text,
  ADD COLUMN IF NOT EXISTS mollie_mandate_id      text,
  ADD COLUMN IF NOT EXISTS mollie_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_started_at timestamptz;

COMMENT ON COLUMN public.companies.mollie_subscription_id IS
  'ID de la subscription Mollie pour l''abonnement SaaS de cette entreprise (facturation A).';

-- ───────────────────────────────────────────────────────────────────────────
-- Expiration automatique des essais (blocage DOUX : on bascule simplement le
-- statut vers 'expired'. L''app passe alors le tenant en lecture seule + bandeau
-- d''upgrade ; aucune donnée n''est supprimée).
-- Une company en essai dont trial_ends_at est dépassé ET qui n''a pas d''abonnement
-- actif (pas de mollie_subscription_id) passe 'trial' → 'expired'.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.expire_overdue_trials()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.companies
     SET account_status = 'expired'
   WHERE account_status = 'trial'
     AND trial_ends_at IS NOT NULL
     AND trial_ends_at < now()
     AND (mollie_subscription_id IS NULL OR mollie_subscription_id = '');
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- Planification quotidienne (03:17 UTC) si pg_cron est disponible.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('expire-overdue-trials')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-overdue-trials');
    PERFORM cron.schedule(
      'expire-overdue-trials',
      '17 3 * * *',
      $cron$ SELECT public.expire_overdue_trials(); $cron$
    );
  END IF;
END;
$$;
