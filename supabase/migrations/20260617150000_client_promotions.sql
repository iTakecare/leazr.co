-- Bannières publicitaires de l'espace client (gérées côté admin).
-- Appliquée en prod via execute_sql (historique migrations désync — pas de db push).
create table if not exists public.client_promotions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  placement text not null default 'top' check (placement in ('top','sidebar')),
  title text not null,
  description text,
  image_url text,
  cta_label text,
  link_url text,
  background text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_promotions enable row level security;

drop policy if exists client_promotions_select on public.client_promotions;
create policy client_promotions_select on public.client_promotions
  for select to authenticated
  using (company_id = public.get_user_company_id());

drop policy if exists client_promotions_admin on public.client_promotions;
create policy client_promotions_admin on public.client_promotions
  for all to authenticated
  using (company_id = public.get_user_company_id()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')))
  with check (company_id = public.get_user_company_id()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')));

create index if not exists idx_client_promotions_company
  on public.client_promotions(company_id, placement, is_active, sort_order);
