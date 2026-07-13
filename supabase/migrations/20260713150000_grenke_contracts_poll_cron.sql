-- Grenke contracts poller cron.
--
-- Companion to 20260601160000_grenke_status_poll_cron.sql. Same rationale:
-- this migration DOCUMENTS the cron setup and is applied MANUALLY via the
-- Supabase SQL Editor because it embeds the GRENKE_CRON_SECRET, which must
-- NOT live in version control. Replace <GRENKE_CRON_SECRET> with the value
-- stored in Supabase secrets (the same one used by grenke-status-poll).
--
-- WHY THIS EXISTS:
-- The offers poller (grenke-status-poll, action poll_grenke_statuses) refreshes
-- offers only while they are NOT yet converted to a contract — it explicitly
-- skips `converted_to_contract = true` and hands those over to the contracts
-- poll. But the contracts poll had never been scheduled, so once an offer
-- became a contract its Grenke state stopped being refreshed. Result observed
-- 2026-07-13: contract grenke_state frozen since ~2026-06-03 (the day the
-- contracts.grenke_state column was populated once), and the Contrats list
-- badges drifting from the live Grenke portal.
--
-- The job POSTs {action:"poll_grenke_contracts"} to the grenke-api edge
-- function every 30 minutes. grenke-api runs with verify_jwt=false and checks
-- the X-Cron-Secret header itself, then, for every company that has Grenke
-- offers, runs reconcile_grenke_contracts (refresh contract states +
-- auto-link newly-accepted deals) and backfills signed contract PDFs.
--
-- Change '*/30' to '*/15' if you want the 15-minute cadence the code comments
-- originally assumed; 30 min matches the offers poller and keeps Grenke API
-- load low.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule('grenke-contracts-poll');
exception when others then null;
end $$;

select cron.schedule(
  'grenke-contracts-poll',
  '*/30 * * * *',
  $cron$
  select net.http_post(
    url := 'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/grenke-api',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', '<GRENKE_CRON_SECRET>'
    ),
    body := jsonb_build_object('action', 'poll_grenke_contracts')
  );
  $cron$
);

-- One-shot: fire the poll immediately so the ~40 days of drift is caught up now
-- instead of waiting for the first scheduled tick. (Equivalent to clicking
-- "Synchroniser" in Settings -> Integrations -> Grenke, but for every company.)
select net.http_post(
  url := 'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/grenke-api',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'X-Cron-Secret', '<GRENKE_CRON_SECRET>'
  ),
  body := jsonb_build_object('action', 'poll_grenke_contracts')
);
