-- FEATURE : plusieurs utilisateurs par fiche client (un seul clients.user_id avant).
-- Table de liaison + helper auth_client_ids() ; is_client_user() inclut la liaison ;
-- toutes les policies "client-own" repointées sur auth_client_ids() (au lieu de
-- clients.user_id seul) — appliqué en prod via execute_sql sur : contracts, offers,
-- contract_equipment, offer_documents, collaborators, offer_equipment, clients,
-- support_tickets, ticket_replies, client_custom_* (zzz_client_own).

create table if not exists public.client_user_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique(client_id, user_id)
);
create index if not exists idx_client_user_accounts_user on public.client_user_accounts(user_id);
create index if not exists idx_client_user_accounts_client on public.client_user_accounts(client_id);
alter table public.client_user_accounts enable row level security;

create or replace function public.auth_client_ids() returns setof uuid
language sql stable security definer set search_path=public as $$
  select id from public.clients where user_id = auth.uid()
  union
  select client_id from public.client_user_accounts where user_id = auth.uid()
$$;

create or replace function public.is_client_user() returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.clients where user_id = auth.uid())
      or exists(select 1 from public.client_user_accounts where user_id = auth.uid())
$$;

drop policy if exists cua_staff on public.client_user_accounts;
create policy cua_staff on public.client_user_accounts for all to authenticated
  using ((not public.is_client_user()) and exists(select 1 from public.clients c where c.id = client_id and c.company_id = get_user_company_id()))
  with check ((not public.is_client_user()) and exists(select 1 from public.clients c where c.id = client_id and c.company_id = get_user_company_id()));
drop policy if exists cua_self on public.client_user_accounts;
create policy cua_self on public.client_user_accounts for select to authenticated
  using (client_id in (select public.auth_client_ids()));
-- NB: les ALTER POLICY des tables client (repointage sur auth_client_ids) ont été
-- appliqués via execute_sql ; voir l'historique de session.
