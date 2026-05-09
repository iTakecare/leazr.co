-- Voice AI calls (Alex) — foundation
-- PR1: schema + RGPD consent column. No UI/edge function consumes this yet.

-- 1. Consent column on clients (RGPD: explicit opt-in for AI phone calls)
alter table public.clients
  add column if not exists voice_consent_given_at timestamptz;

comment on column public.clients.voice_consent_given_at is
  'Timestamp when client consented to be contacted by an AI voice assistant. NULL = no consent. RGPD opt-in.';

-- 2. voice_calls table
create table if not exists public.voice_calls (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid not null references public.clients(id) on delete cascade,
  company_id            uuid not null references public.companies(id) on delete cascade,
  kyc_report_id         uuid references public.client_kyc_reports(id) on delete set null,

  -- Vapi linkage
  vapi_call_id          text unique,
  vapi_assistant_id     text,

  -- Lifecycle
  status                text not null default 'queued'
    check (status in (
      'queued','ringing','in_progress','completed',
      'failed','no_answer','transferred_to_human'
    )),
  initiated_by          uuid references auth.users(id) on delete set null,
  to_phone              text not null,
  language              text default 'fr' check (language in ('fr','nl','en')),

  -- Outcome
  duration_seconds      int,
  transcription         text,
  summary               text,
  client_blockers       jsonb,         -- e.g. ["mail_not_received","doc_lost"]
  recording_url         text,
  cost_eur              numeric(10,4),

  -- RGPD
  consent_snapshot_at   timestamptz not null,  -- consent timestamp at call time

  metadata              jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.voice_calls is
  'AI voice calls (Alex assistant) made to clients about pending KYC documents.';

-- 3. Indexes
create index if not exists idx_voice_calls_client    on public.voice_calls(client_id);
create index if not exists idx_voice_calls_company   on public.voice_calls(company_id, created_at desc);
create index if not exists idx_voice_calls_kyc       on public.voice_calls(kyc_report_id) where kyc_report_id is not null;
create index if not exists idx_voice_calls_status    on public.voice_calls(status);

-- 4. updated_at trigger (mirrors pattern used elsewhere in codebase)
create or replace function public.tg_voice_calls_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_voice_calls_updated_at on public.voice_calls;
create trigger trg_voice_calls_updated_at
  before update on public.voice_calls
  for each row execute function public.tg_voice_calls_set_updated_at();

-- 5. RLS
alter table public.voice_calls enable row level security;

drop policy if exists voice_calls_select on public.voice_calls;
create policy voice_calls_select
  on public.voice_calls for select
  using (company_id = get_user_company_id() or is_admin_optimized());

drop policy if exists voice_calls_insert on public.voice_calls;
create policy voice_calls_insert
  on public.voice_calls for insert
  with check (company_id = get_user_company_id());

drop policy if exists voice_calls_update on public.voice_calls;
create policy voice_calls_update
  on public.voice_calls for update
  using (company_id = get_user_company_id())
  with check (company_id = get_user_company_id());

drop policy if exists voice_calls_delete on public.voice_calls;
create policy voice_calls_delete
  on public.voice_calls for delete
  using (initiated_by = auth.uid() or is_admin_optimized());
