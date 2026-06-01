-- Phase 3c.1 — Grenke status poller cron.
--
-- This migration DOCUMENTS the cron setup. It is applied manually via the
-- Supabase SQL Editor because it embeds the GRENKE_CRON_SECRET, which must
-- NOT live in version control. Replace <GRENKE_CRON_SECRET> with the value
-- stored in Supabase secrets (`supabase secrets list` shows the name; the
-- value was generated with `openssl rand -hex 32` when the poller shipped).
--
-- The job POSTs {action:"poll_grenke_statuses"} to the grenke-api edge
-- function every 30 minutes. The function authenticates the call via the
-- X-Cron-Secret header (grenke-api runs with verify_jwt=false and does its
-- own auth), then refreshes every submitted offer still in a non-terminal
-- Grenke state.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule('grenke-status-poll');
exception when others then null;
end $$;

select cron.schedule(
  'grenke-status-poll',
  '*/30 * * * *',
  $cron$
  select net.http_post(
    url := 'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/grenke-api',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', '<GRENKE_CRON_SECRET>'
    ),
    body := jsonb_build_object('action', 'poll_grenke_statuses')
  );
  $cron$
);
