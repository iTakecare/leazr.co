-- ============================================================================
-- CRM Acquisition — Phase 0 : débloquer l'existant
--
-- 1) Rattachement des emails IMAP à un CLIENT (linked_client_id avait été
--    ajouté puis supprimé en mars — sans lui, aucune vue « toutes les
--    interactions de ce compte » n'est possible).
-- 2) Colonnes de triage sur contact_submissions (les formulaires du site
--    arrivent en base mais aucun écran ne les lit ; l'UI arrive en Phase 3).
-- 3) Activation des crons de rappel : task-reminders et send-callback-reminders
--    existaient mais n'étaient JAMAIS déclenchés.
--
-- Appliqué via l'API Management (PAS `supabase db push` — historique désync).
-- <SERVICE_ROLE_KEY> est substitué à l'application par scripts/apply-crm-phase0.mjs
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Emails IMAP -> client
-- ---------------------------------------------------------------------------

alter table public.synced_emails
  add column if not exists linked_client_id uuid references public.clients(id) on delete set null;

create index if not exists idx_synced_emails_linked_client
  on public.synced_emails(linked_client_id);

-- Domaines grand public : on ne rattache JAMAIS un client par domaine sur
-- ceux-là (sinon tous les gmail.com tombent sur le même client).
create or replace function public.is_generic_email_domain(p_domain text)
returns boolean
language sql
immutable
as $$
  select lower(coalesce(p_domain, '')) = any (array[
    'gmail.com','googlemail.com','hotmail.com','hotmail.be','hotmail.fr',
    'hotmail.nl','outlook.com','outlook.be','outlook.fr','outlook.nl',
    'live.com','live.be','live.fr','live.nl','yahoo.com','yahoo.fr','yahoo.co.uk',
    'msn.com','icloud.com','me.com','mac.com','aol.com','protonmail.com','proton.me',
    'skynet.be','telenet.be','voo.be','scarlet.be','base.be','belgacom.net',
    'orange.fr','wanadoo.fr','free.fr','sfr.fr','laposte.net','bbox.fr','numericable.fr',
    'gmx.com','gmx.net','gmx.be','web.de','t-online.de','ziggo.nl','kpnmail.nl','home.nl'
  ]);
$$;

-- Résolution adresse email -> client, dans le périmètre d'UNE société.
-- Ordre : email exact du client, puis email exact d'un collaborateur, puis
-- domaine d'entreprise mais uniquement s'il désigne un client et un seul.
create or replace function public.match_email_to_client(p_company_id uuid, p_address text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_addr   text := lower(trim(coalesce(p_address, '')));
  v_domain text;
  v_client uuid;
  v_ids    uuid[];
begin
  if p_company_id is null or v_addr = '' or position('@' in v_addr) = 0 then
    return null;
  end if;

  -- a) email exact du client
  select c.id into v_client
    from public.clients c
   where c.company_id = p_company_id
     and lower(c.email) = v_addr
   limit 1;
  if v_client is not null then
    return v_client;
  end if;

  -- b) email exact d'un collaborateur rattaché à un client
  select c.id into v_client
    from public.collaborators col
    join public.clients c on c.id = col.client_id
   where c.company_id = p_company_id
     and lower(col.email) = v_addr
   limit 1;
  if v_client is not null then
    return v_client;
  end if;

  -- c) domaine d'entreprise, seulement si non ambigu
  v_domain := split_part(v_addr, '@', 2);
  if public.is_generic_email_domain(v_domain) then
    return null;
  end if;

  select array_agg(distinct c.id) into v_ids
    from public.clients c
   where c.company_id = p_company_id
     and c.email is not null
     and split_part(lower(c.email), '@', 2) = v_domain;

  if v_ids is not null and array_length(v_ids, 1) = 1 then
    return v_ids[1];
  end if;

  return null;
end;
$$;

-- Auto-rattachement à l'insertion (mail-sync n'a rien à faire de plus)
create or replace function public.autolink_synced_email_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.linked_client_id is null then
    new.linked_client_id := public.match_email_to_client(new.company_id, new.from_address);
    if new.linked_client_id is null then
      new.linked_client_id := public.match_email_to_client(new.company_id, new.to_address);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_synced_emails_autolink_client on public.synced_emails;
create trigger trg_synced_emails_autolink_client
  before insert on public.synced_emails
  for each row execute function public.autolink_synced_email_client();

-- Backfill de l'historique
update public.synced_emails e
   set linked_client_id = coalesce(
         public.match_email_to_client(e.company_id, e.from_address),
         public.match_email_to_client(e.company_id, e.to_address)
       )
 where e.linked_client_id is null;

-- ---------------------------------------------------------------------------
-- 2) contact_submissions : colonnes de triage
-- ---------------------------------------------------------------------------

alter table public.contact_submissions
  add column if not exists source          text default 'website',
  add column if not exists assigned_to     uuid references public.profiles(id) on delete set null,
  add column if not exists handled_by      uuid references public.profiles(id) on delete set null,
  add column if not exists handled_at      timestamptz,
  add column if not exists client_id       uuid references public.clients(id) on delete set null,
  add column if not exists internal_notes  text;

create index if not exists idx_contact_submissions_company_status
  on public.contact_submissions(company_id, status);
create index if not exists idx_contact_submissions_created
  on public.contact_submissions(created_at desc);

-- ---------------------------------------------------------------------------
-- 3) Crons de rappel (les deux fonctions existaient sans jamais tourner)
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$ begin perform cron.unschedule('task-reminders-daily'); exception when others then null; end $$;
do $$ begin perform cron.unschedule('callback-reminders-daily'); exception when others then null; end $$;

-- Rappels de tâches assignées (échéance < 24 h ou en retard), 07:00 UTC
select cron.schedule(
  'task-reminders-daily',
  '0 7 * * 1-5',
  $cron$
  select net.http_post(
    url := 'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/task-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := jsonb_build_object('source', 'cron')
  );
  $cron$
);

-- Rappels de callbacks commerciaux (offer_call_logs du jour + retards), 07:30 UTC
select cron.schedule(
  'callback-reminders-daily',
  '30 7 * * 1-5',
  $cron$
  select net.http_post(
    url := 'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/send-callback-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := jsonb_build_object('source', 'cron')
  );
  $cron$
);
