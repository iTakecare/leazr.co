-- Grenke submission history: one Leazr offer can go through several Grenke
-- dossiers over its life (e.g. a first request gets Declined, then after the
-- client provides financial documents Grenke re-analyses it under a NEW request
-- number). We keep ONE Leazr offer and record every Grenke dossier here, with
-- exactly one marked active. The offer's grenke_* columns mirror the active row.

CREATE TABLE IF NOT EXISTS public.grenke_submissions (
  id               uuid primary key default gen_random_uuid(),
  offer_id         uuid not null references public.offers(id) on delete cascade,
  company_id       uuid not null,
  financing_id     text,
  request_id       text,
  state            text,
  environment      text,
  submitted_at     timestamptz,
  state_updated_at timestamptz,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

CREATE UNIQUE INDEX IF NOT EXISTS grenke_submissions_offer_financing_uniq
  ON public.grenke_submissions (offer_id, financing_id);
CREATE INDEX IF NOT EXISTS grenke_submissions_offer_idx
  ON public.grenke_submissions (offer_id);
CREATE INDEX IF NOT EXISTS grenke_submissions_financing_idx
  ON public.grenke_submissions (financing_id);

-- Backfill: every already-linked offer becomes its (single, active) submission.
INSERT INTO public.grenke_submissions
  (offer_id, company_id, financing_id, request_id, state, environment, submitted_at, state_updated_at, is_active)
SELECT id, company_id, grenke_financing_id, grenke_request_id, grenke_state,
       grenke_environment, grenke_submitted_at, grenke_state_updated_at, true
FROM public.offers
WHERE grenke_financing_id IS NOT NULL
ON CONFLICT (offer_id, financing_id) DO NOTHING;

-- RLS off (the edge function reads/writes with the service role and enforces the
-- company check itself; the UI reads the history through the edge function).
ALTER TABLE public.grenke_submissions DISABLE ROW LEVEL SECURITY;
