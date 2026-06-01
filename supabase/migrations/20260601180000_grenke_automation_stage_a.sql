-- Stage A automation — ID-card collection on internal score A.
--
-- offers.id_collection_status: tracks where the ID-card collection stands for
--   a Grenke offer (null = not handled, 'requested' = email sent, 'valid' =
--   existing client with a valid ID on file, 'received' = doc uploaded).
-- grenke_automation_settings: per-company opt-in toggles (off by default).
-- offer_automation_log: audit trail of every automated action.

alter table public.offers
  add column if not exists id_collection_status text;

create table if not exists public.grenke_automation_settings (
  company_id          uuid primary key references public.companies(id) on delete cascade,
  auto_id_collection  boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.grenke_automation_settings enable row level security;
drop policy if exists grenke_automation_settings_access on public.grenke_automation_settings;
create policy grenke_automation_settings_access on public.grenke_automation_settings
  for all using (company_id = public.get_user_company_id() or public.is_admin_optimized())
  with check (company_id = public.get_user_company_id() or public.is_admin_optimized());

create table if not exists public.offer_automation_log (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null,
  offer_id    uuid references public.offers(id) on delete cascade,
  stage       text not null,
  action      text not null,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_offer_automation_log_offer on public.offer_automation_log(offer_id);
alter table public.offer_automation_log enable row level security;
drop policy if exists offer_automation_log_access on public.offer_automation_log;
create policy offer_automation_log_access on public.offer_automation_log
  for select using (company_id = public.get_user_company_id() or public.is_admin_optimized());
