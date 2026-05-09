-- =====================================================
-- Auto-compute contract_end_date from start_date + duration
-- =====================================================
--
-- Problem we're fixing:
--   contract_end_date is currently filled in manually (or imported from CSV)
--   and drifts out of sync with contract_start_date + contract_duration.
--   Concrete example seen in prod: Zakaria Gayet — start 2026-07-01, duration
--   36 months, but end_date stamped 2026-10-01 (i.e. +3 months instead of +36).
--
-- Fix:
--   1. A pure helper function that computes end = start + duration months.
--   2. A BEFORE INSERT/UPDATE trigger that auto-fills contract_end_date
--      whenever contract_start_date or the duration field change. This
--      makes the column impossible to leave stale — every code path
--      (frontend, import, edge function, manual SQL) gets the right
--      value for free.
--   3. A one-shot backfill that recomputes end_date for every contract
--      that has start_date + duration. Conservative on missing data.
--
-- Backwards compat: lease_duration was the older column; many rows still
-- have it instead of contract_duration. We coalesce so both are honored.

-- ---------- 1) Helper function ----------
CREATE OR REPLACE FUNCTION public.compute_contract_end_date(
  p_start_date date,
  p_duration_months integer
) RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_start_date IS NULL OR p_duration_months IS NULL OR p_duration_months <= 0 THEN
    RETURN NULL;
  END IF;
  -- Convention used elsewhere in Leazr: end_date = start_date + N months
  -- exactly (e.g. 01/04/2026 + 36 months → 01/04/2029, the first day after
  -- the contract ends). Don't subtract a day, that breaks reporting that
  -- assumes the same convention.
  RETURN (p_start_date + (p_duration_months || ' months')::interval)::date;
END;
$$;

COMMENT ON FUNCTION public.compute_contract_end_date IS
'Returns start_date + duration_months. Matches the convention used across Leazr UI / reports.';

-- ---------- 2) Trigger function ----------
CREATE OR REPLACE FUNCTION public.auto_calculate_contract_end_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duration integer;
BEGIN
  -- Prefer the newer contract_duration column; fall back to lease_duration
  -- for legacy rows where contract_duration was never written.
  v_duration := COALESCE(NEW.contract_duration, NEW.lease_duration);

  IF NEW.contract_start_date IS NOT NULL
     AND v_duration IS NOT NULL
     AND v_duration > 0 THEN
    NEW.contract_end_date := compute_contract_end_date(NEW.contract_start_date, v_duration);
  END IF;

  RETURN NEW;
END;
$$;

-- Drop+recreate so re-running the migration is idempotent.
DROP TRIGGER IF EXISTS trigger_auto_calculate_contract_end_date ON public.contracts;
CREATE TRIGGER trigger_auto_calculate_contract_end_date
  BEFORE INSERT OR UPDATE OF contract_start_date, contract_duration, lease_duration
  ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_contract_end_date();

COMMENT ON TRIGGER trigger_auto_calculate_contract_end_date ON public.contracts IS
'Keeps contract_end_date in sync with contract_start_date + contract_duration (or lease_duration). Fires on any change to those source columns.';

-- ---------- 3) One-shot backfill ----------
-- Recompute end_date for every contract that has the inputs needed and
-- where the current end_date is either NULL or does not match. Skip rows
-- without a duration set anywhere — those are genuinely undefined and
-- should be looked at by hand rather than guessed.
WITH backfill AS (
  SELECT
    id,
    contract_end_date AS old_end,
    compute_contract_end_date(
      contract_start_date,
      COALESCE(contract_duration, lease_duration)
    ) AS new_end
  FROM public.contracts
  WHERE contract_start_date IS NOT NULL
    AND COALESCE(contract_duration, lease_duration) > 0
)
UPDATE public.contracts c
   SET contract_end_date = b.new_end,
       updated_at = now()
  FROM backfill b
 WHERE c.id = b.id
   AND b.new_end IS NOT NULL
   AND (c.contract_end_date IS DISTINCT FROM b.new_end);
