BEGIN;

-- Enum status plus riche (chaîne flexible, contrôle applicatif)
COMMENT ON COLUMN public.order_line_sourcing.status IS
  'proposed (par employé) | approved (par admin) | rejected | ordered | received | cancelled | unavailable';

ALTER TABLE public.order_line_sourcing
  ADD COLUMN IF NOT EXISTS proposed_by uuid,
  ADD COLUMN IF NOT EXISTS proposed_at timestamptz,
  ADD COLUMN IF NOT EXISTS validated_by uuid,
  ADD COLUMN IF NOT EXISTS validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS validation_notes text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS source_channel text,
  -- 'search' (page Optimiseur) | 'extension' (Chrome) | 'manual_url' (collage URL) | 'api_b2b'
  ADD COLUMN IF NOT EXISTS proposer_role text;
  -- 'admin' | 'sales_manager' | 'employee' (snapshot du rôle au moment de la proposition)

CREATE INDEX IF NOT EXISTS idx_ols_pending_validation
  ON public.order_line_sourcing (company_id, status)
  WHERE status = 'proposed';

-- Vue agrégée : combien d'offres en attente par user ?
CREATE OR REPLACE VIEW public.v_sourcing_pending_count AS
SELECT
  company_id,
  COUNT(*) AS total_pending,
  COUNT(DISTINCT proposed_by) AS proposers_count,
  MIN(proposed_at) AS oldest_pending_at
FROM public.order_line_sourcing
WHERE status = 'proposed'
GROUP BY company_id;

COMMIT;
