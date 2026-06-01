-- Grenke deal-lifecycle automation — Stages B & C.
--
-- Extends the per-company opt-in settings with two more downstream stages,
-- each defaulting OFF (a human must knowingly enable them, since they trigger
-- real Grenke submissions / real DocuSign envelopes):
--   * auto_submit       — Stage B: auto-submit a score-A Grenke offer to Grenke
--                         (== "introduit leaser") with no manual click.
--   * auto_esignature   — Stage C: when Grenke turns ReadyToSign, auto-start the
--                         DocuSign e-signature (client + supplier + delivery conf).
--
-- The supplier (iTakecare) signer used for the automatic e-signature is taken
-- from these esign_partner_* columns when set, otherwise we fall back to a
-- company admin profile at runtime.
--
-- offers.grenke_esign_started_at guards Stage C against re-triggering between
-- the moment we start the e-signature and the next status poll (handleStart-
-- ESignature does not itself move grenke_state away from 'ReadyToSign').

ALTER TABLE public.grenke_automation_settings
  ADD COLUMN IF NOT EXISTS auto_submit               boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_esignature           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS esign_partner_title       text,
  ADD COLUMN IF NOT EXISTS esign_partner_first_name  text,
  ADD COLUMN IF NOT EXISTS esign_partner_last_name   text,
  ADD COLUMN IF NOT EXISTS esign_partner_email       text,
  ADD COLUMN IF NOT EXISTS esign_partner_mobile      text;

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS grenke_esign_started_at timestamptz;
