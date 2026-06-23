-- ============================================================================
-- Appels groupés Alex (campagnes vocales) + statut voicemail
-- Appliqué via l'API Management (PAS db push — historique désync). Le secret
-- du cron est injecté à l'application ; ici un placeholder pour la trace.
-- ============================================================================

-- 1) Statut 'voicemail' pour voice_calls (Alex laisse un message sur répondeur)
alter table public.voice_calls drop constraint if exists voice_calls_status_check;
alter table public.voice_calls add constraint voice_calls_status_check
  check (status = any (array[
    'queued','ringing','in_progress','completed','failed',
    'no_answer','busy','canceled','transferred_to_human','voicemail'
  ]));

-- 2) Table des campagnes d'appels groupés
create table if not exists public.voice_campaigns (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  name            text not null,
  objective       text,                       -- contexte de l'appel, injecté à Alex (missing_docs)
  language        text not null default 'fr' check (language = any (array['fr','nl','en'])),
  status          text not null default 'running' check (status = any (array['running','completed','canceled'])),
  created_by      uuid,
  report_email    text,                       -- destinataire du rapport, figé au lancement
  total_calls     int not null default 0,
  completed_calls int not null default 0,
  report_sent_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_voice_campaigns_company on public.voice_campaigns(company_id);
create index if not exists idx_voice_campaigns_status on public.voice_campaigns(status);

-- 3) Lien voice_calls -> campagne
alter table public.voice_calls add column if not exists campaign_id uuid
  references public.voice_campaigns(id) on delete set null;
create index if not exists idx_voice_calls_campaign on public.voice_calls(campaign_id);

-- 4) RLS (isolation société + admin), même pattern que voice_calls
alter table public.voice_campaigns enable row level security;

drop policy if exists voice_campaigns_select on public.voice_campaigns;
create policy voice_campaigns_select on public.voice_campaigns for select
  using (company_id = get_user_company_id() or is_admin_optimized());

drop policy if exists voice_campaigns_insert on public.voice_campaigns;
create policy voice_campaigns_insert on public.voice_campaigns for insert
  with check (company_id = get_user_company_id());

drop policy if exists voice_campaigns_update on public.voice_campaigns;
create policy voice_campaigns_update on public.voice_campaigns for update
  using (company_id = get_user_company_id() or is_admin_optimized())
  with check (company_id = get_user_company_id() or is_admin_optimized());

drop policy if exists voice_campaigns_delete on public.voice_campaigns;
create policy voice_campaigns_delete on public.voice_campaigns for delete
  using (is_admin_optimized());

-- 5) updated_at auto
create or replace function public.touch_voice_campaigns_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_voice_campaigns_updated_at on public.voice_campaigns;
create trigger trg_voice_campaigns_updated_at before update on public.voice_campaigns
  for each row execute function public.touch_voice_campaigns_updated_at();

-- 6) Cron dispatcher (1 appel/min, gate 1-à-la-fois côté fonction)
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$ begin perform cron.unschedule('voice-campaign-dispatch'); exception when others then null; end $$;

select cron.schedule(
  'voice-campaign-dispatch',
  '* * * * *',
  $cron$
  select net.http_post(
    url := 'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/voice-campaign-dispatch',
    headers := jsonb_build_object('Content-Type','application/json','X-Cron-Secret','<VOICE_CRON_SECRET>'),
    body := jsonb_build_object('source','cron')
  );
  $cron$
);
