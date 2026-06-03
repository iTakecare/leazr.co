-- Surface the Grenke contract sub-state directly on Leazr contracts so the
-- Contrats screen can distinguish "Demande réglée" (ApplicationSettled —
-- paiement fait, le contrat démarre le trimestre suivant) from "Actif"
-- (RunningContract). The 15-min contracts sync writes this on every run, both
-- for offer-linked contracts and for contracts imported directly from Grenke.
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS grenke_state text,
  ADD COLUMN IF NOT EXISTS grenke_state_updated_at timestamptz;
