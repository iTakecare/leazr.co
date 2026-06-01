-- Grenke field mappings — Phase 3a.2
--
-- Generic per-company mapping table to translate Leazr internal values into
-- the values Grenke expects in the FinancingRequest payload. One row per
-- (company, kind, leazr_key) triple, three supported kinds:
--
--   'legal_form'    leazr_key = clients.entity_type ('societe'/'independant'/…)
--                   grenke_value = numeric Grenke LegalFormId as text (e.g. "1")
--
--   'object_type'   leazr_key = categories.id (UUID stored as text)
--                   grenke_value = numeric Grenke ObjectTypeId as text (e.g. "1")
--
--   'manufacturer'  leazr_key = brands.id (UUID stored as text)
--                   grenke_value = free-text manufacturer name (e.g. "Apple")
--                                  Grenke accepts any string; the swagger note
--                                  explicitly suggests "Other" as fallback.
--
-- The mappings are edited by company admins via the Grenke integration card
-- in Settings, and consumed server-side by the build_offer_payload edge
-- function (Phase 3a.2b).

create table if not exists public.grenke_field_mappings (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  kind         text not null check (kind in ('legal_form', 'object_type', 'manufacturer')),
  leazr_key    text not null,
  grenke_value text not null,
  label        text,  -- optional human-readable label of the Leazr side (cached for the UI)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (company_id, kind, leazr_key)
);

create index if not exists idx_grenke_field_mappings_company_kind
  on public.grenke_field_mappings(company_id, kind);

alter table public.grenke_field_mappings enable row level security;

drop policy if exists grenke_field_mappings_company_access on public.grenke_field_mappings;
create policy grenke_field_mappings_company_access
  on public.grenke_field_mappings
  for all
  using (company_id = public.get_user_company_id() or public.is_admin_optimized())
  with check (company_id = public.get_user_company_id() or public.is_admin_optimized());

-- updated_at trigger (mirrors the pattern used elsewhere in the codebase)
create or replace function public.tg_grenke_field_mappings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_grenke_field_mappings_updated_at on public.grenke_field_mappings;
create trigger trg_grenke_field_mappings_updated_at
  before update on public.grenke_field_mappings
  for each row execute function public.tg_grenke_field_mappings_updated_at();
