-- ============================================================================
-- Rapports du Coach Alex (analyses de transcriptions) — persistés pour
-- affichage dans l'onglet Configuration du Centre d'appels et pour nourrir le
-- dialogue avec le coach. Appliqué via l'API Management (PAS db push — historique
-- désync). Même pattern RLS que voice_campaigns (isolation société + admin).
-- ============================================================================

create table if not exists public.voice_coach_reports (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  source         text not null default 'cron' check (source = any (array['cron','manual'])),
  window_days    int not null default 7,
  calls_analyzed int not null default 0,
  stats          jsonb not null default '{}'::jsonb,
  html           text not null,
  summary        text,                       -- bilan texte (sans HTML) pour le contexte du chat
  created_by     uuid,
  created_at     timestamptz not null default now()
);

create index if not exists idx_voice_coach_reports_company
  on public.voice_coach_reports(company_id, created_at desc);

alter table public.voice_coach_reports enable row level security;

drop policy if exists voice_coach_reports_select on public.voice_coach_reports;
create policy voice_coach_reports_select on public.voice_coach_reports for select
  using (company_id = get_user_company_id() or is_admin_optimized());

drop policy if exists voice_coach_reports_insert on public.voice_coach_reports;
create policy voice_coach_reports_insert on public.voice_coach_reports for insert
  with check (company_id = get_user_company_id() or is_admin_optimized());

drop policy if exists voice_coach_reports_delete on public.voice_coach_reports;
create policy voice_coach_reports_delete on public.voice_coach_reports for delete
  using (is_admin_optimized());
