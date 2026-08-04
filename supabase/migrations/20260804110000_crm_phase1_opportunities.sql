-- ============================================================================
-- CRM Acquisition — Phase 1 : socle de données
--
-- Introduit l'OPPORTUNITÉ comme pivot du cycle de vente, indépendante de
-- l'offre. Jusqu'ici tout était arrimé à `offers` : un prospect sans offre
-- chiffrée n'existait pas, et « l'entonnoir de conversion » était en réalité
-- le workflow de financement (docs → leaser → accordé), qui commence APRÈS
-- la vente.
--
--   contacts (personnes)  ─┐
--   clients (entreprises) ─┼─► opportunities ─► offers ─► contracts
--                          │        └─► crm_activities (timeline tous canaux)
--
-- Appliqué via l'API Management (PAS `supabase db push` — historique désync).
-- Voir scripts/apply-crm-phase1.mjs
-- ============================================================================

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 1) Étapes de pipeline (configurables par tenant)
-- ---------------------------------------------------------------------------

create table if not exists public.pipeline_stages (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  key           text not null,
  label         text not null,
  position      int  not null default 0,
  probability   numeric(5,2) not null default 0,   -- 0..100, sert au prévisionnel pondéré
  color         text not null default '#94a3b8',
  is_won        boolean not null default false,
  is_lost       boolean not null default false,
  is_default    boolean not null default false,    -- étape d'entrée d'une nouvelle opportunité
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (company_id, key)
);

create index if not exists idx_pipeline_stages_company on public.pipeline_stages(company_id, position);

-- Jeu d'étapes par défaut pour chaque société existante
insert into public.pipeline_stages (company_id, key, label, position, probability, color, is_won, is_lost, is_default)
select c.id, s.key, s.label, s.position, s.probability, s.color, s.is_won, s.is_lost, s.is_default
  from public.companies c
 cross join (values
    ('new',         'Nouveau',                1,  10.0, '#94a3b8', false, false, true),
    ('contacted',   'Contacté',               2,  20.0, '#3b82f6', false, false, false),
    ('qualified',   'Qualifié',               3,  40.0, '#6366f1', false, false, false),
    ('proposal',    'Proposition envoyée',    4,  60.0, '#f59e0b', false, false, false),
    ('negotiation', 'Négociation',            5,  80.0, '#8b5cf6', false, false, false),
    ('won',         'Gagné',                  6, 100.0, '#22c55e', true,  false, false),
    ('lost',        'Perdu',                  7,   0.0, '#ef4444', false, true,  false)
  ) as s(key, label, position, probability, color, is_won, is_lost, is_default)
 where not exists (
   select 1 from public.pipeline_stages ps where ps.company_id = c.id and ps.key = s.key
 );

-- Toute nouvelle société hérite du jeu par défaut
create or replace function public.seed_default_pipeline_stages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pipeline_stages (company_id, key, label, position, probability, color, is_won, is_lost, is_default)
  values
    (new.id, 'new',         'Nouveau',             1,  10.0, '#94a3b8', false, false, true),
    (new.id, 'contacted',   'Contacté',            2,  20.0, '#3b82f6', false, false, false),
    (new.id, 'qualified',   'Qualifié',            3,  40.0, '#6366f1', false, false, false),
    (new.id, 'proposal',    'Proposition envoyée', 4,  60.0, '#f59e0b', false, false, false),
    (new.id, 'negotiation', 'Négociation',         5,  80.0, '#8b5cf6', false, false, false),
    (new.id, 'won',         'Gagné',               6, 100.0, '#22c55e', true,  false, false),
    (new.id, 'lost',        'Perdu',               7,   0.0, '#ef4444', false, true,  false)
  on conflict (company_id, key) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_companies_seed_pipeline on public.companies;
create trigger trg_companies_seed_pipeline
  after insert on public.companies
  for each row execute function public.seed_default_pipeline_stages();

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 2) Contacts — personnes physiques, existent AVANT tout client
-- ---------------------------------------------------------------------------

create table if not exists public.contacts (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  client_id       uuid references public.clients(id) on delete set null,
  first_name      text,
  last_name       text,
  email           text,
  phone           text,
  mobile          text,
  job_title       text,
  linkedin_url    text,
  company_name    text,            -- raison sociale tant qu'aucun client n'existe
  vat_number      text,
  website         text,
  language        text not null default 'fr' check (language = any (array['fr','nl','en','de'])),
  source          text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  owner_id        uuid references public.profiles(id) on delete set null,
  tags            text[] not null default '{}',
  notes           text,
  -- Conformité : le dispatcher de séquences (Phase 4) respecte ces drapeaux
  opt_out_email    boolean not null default false,
  opt_out_whatsapp boolean not null default false,
  opt_out_sms      boolean not null default false,
  opt_out_at       timestamptz,
  opt_out_reason   text,
  last_activity_at timestamptz,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists uniq_contacts_company_email
  on public.contacts(company_id, lower(email))
  where email is not null and email <> '';

create index if not exists idx_contacts_company   on public.contacts(company_id);
create index if not exists idx_contacts_client    on public.contacts(client_id);
create index if not exists idx_contacts_owner     on public.contacts(owner_id);
create index if not exists idx_contacts_tags      on public.contacts using gin(tags);

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 3) Opportunités — le pivot du pipeline commercial
-- ---------------------------------------------------------------------------

create table if not exists public.opportunities (
  id                        uuid primary key default gen_random_uuid(),
  company_id                uuid not null references public.companies(id) on delete cascade,
  name                      text not null,
  description               text,
  client_id                 uuid references public.clients(id) on delete set null,
  primary_contact_id        uuid references public.contacts(id) on delete set null,
  stage_id                  uuid references public.pipeline_stages(id) on delete restrict,
  status                    text not null default 'open' check (status = any (array['open','won','lost'])),
  owner_id                  uuid references public.profiles(id) on delete set null,

  -- Attribution
  source                    text,
  utm_source                text,
  utm_medium                text,
  utm_campaign              text,
  utm_term                  text,
  utm_content               text,
  created_from              text not null default 'manual'
                            check (created_from = any (array['manual','meta','website','import','offer_backfill','api','sequence'])),

  -- Valeur
  estimated_monthly_payment numeric(12,2),
  estimated_amount          numeric(12,2),
  currency                  text not null default 'EUR',
  expected_close_date       date,

  -- Chasse : la prochaine action, son canal et sa deadline
  next_action_at            timestamptz,
  next_action_channel       text check (next_action_channel = any (array['call','email','whatsapp','sms','meeting','linkedin','voice_ai','other'])),
  next_action_note          text,

  -- Suivi
  last_activity_at          timestamptz,
  stage_changed_at          timestamptz not null default now(),
  won_at                    timestamptz,
  lost_at                   timestamptz,
  lost_reason               text,
  lost_reason_detail        text,
  intent_score              int,             -- alimenté en Phase 6
  tags                      text[] not null default '{}',

  created_by                uuid references public.profiles(id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists idx_opportunities_company      on public.opportunities(company_id);
create index if not exists idx_opportunities_stage        on public.opportunities(stage_id);
create index if not exists idx_opportunities_owner        on public.opportunities(owner_id);
create index if not exists idx_opportunities_client       on public.opportunities(client_id);
create index if not exists idx_opportunities_contact      on public.opportunities(primary_contact_id);
create index if not exists idx_opportunities_status       on public.opportunities(company_id, status);
create index if not exists idx_opportunities_next_action  on public.opportunities(company_id, next_action_at)
  where status = 'open';
create index if not exists idx_opportunities_tags         on public.opportunities using gin(tags);

-- Lien offre -> opportunité (une opportunité peut porter 0..n offres)
alter table public.offers
  add column if not exists opportunity_id uuid references public.opportunities(id) on delete set null;
create index if not exists idx_offers_opportunity on public.offers(opportunity_id);

-- Enrichissement du référentiel client
alter table public.clients
  add column if not exists owner_id        uuid references public.profiles(id) on delete set null,
  add column if not exists lifecycle_stage text not null default 'customer'
    check (lifecycle_stage = any (array['lead','prospect','customer','churned'])),
  add column if not exists source          text,
  add column if not exists first_contact_at timestamptz;
create index if not exists idx_clients_owner on public.clients(owner_id);

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 4) crm_activities — la timeline unifiée, tous canaux
-- ---------------------------------------------------------------------------

create table if not exists public.crm_activities (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  client_id      uuid references public.clients(id) on delete set null,
  contact_id     uuid references public.contacts(id) on delete set null,
  offer_id       uuid references public.offers(id) on delete set null,

  type      text not null check (type = any (array[
              'call','email','whatsapp','sms','meeting','note','task',
              'stage_change','document','voice_ai','sequence','system'])),
  direction text check (direction = any (array['in','out','internal'])),
  channel   text,

  occurred_at timestamptz not null default now(),
  actor_id    uuid references public.profiles(id) on delete set null,
  actor_label text,                -- « Alex (IA) », « Système », quand actor_id est null

  subject text,
  body    text,
  outcome text,
  payload jsonb not null default '{}'::jsonb,

  -- Pointeur vers l'enregistrement d'origine : garantit l'idempotence des
  -- projections (un même appel/email ne peut pas être projeté deux fois).
  source_table text,
  source_id    uuid,

  created_at timestamptz not null default now()
);

create unique index if not exists uniq_crm_activities_source
  on public.crm_activities(source_table, source_id)
  where source_table is not null and source_id is not null;

create index if not exists idx_crm_activities_company     on public.crm_activities(company_id, occurred_at desc);
create index if not exists idx_crm_activities_opportunity on public.crm_activities(opportunity_id, occurred_at desc);
create index if not exists idx_crm_activities_client      on public.crm_activities(client_id, occurred_at desc);
create index if not exists idx_crm_activities_contact     on public.crm_activities(contact_id, occurred_at desc);
create index if not exists idx_crm_activities_offer       on public.crm_activities(offer_id, occurred_at desc);
create index if not exists idx_crm_activities_type        on public.crm_activities(company_id, type, occurred_at desc);

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 5) updated_at automatique
-- ---------------------------------------------------------------------------

create or replace function public.touch_crm_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_pipeline_stages_updated_at on public.pipeline_stages;
create trigger trg_pipeline_stages_updated_at before update on public.pipeline_stages
  for each row execute function public.touch_crm_updated_at();

drop trigger if exists trg_contacts_updated_at on public.contacts;
create trigger trg_contacts_updated_at before update on public.contacts
  for each row execute function public.touch_crm_updated_at();

drop trigger if exists trg_opportunities_updated_at on public.opportunities;
create trigger trg_opportunities_updated_at before update on public.opportunities
  for each row execute function public.touch_crm_updated_at();

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 6) Cohérence d'étape : status, dates et historisation du changement
-- ---------------------------------------------------------------------------

create or replace function public.sync_opportunity_stage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_won  boolean;
  v_is_lost boolean;
begin
  if new.stage_id is not null and (tg_op = 'INSERT' or new.stage_id is distinct from old.stage_id) then
    select is_won, is_lost into v_is_won, v_is_lost
      from public.pipeline_stages where id = new.stage_id;

    new.stage_changed_at := now();

    if coalesce(v_is_won, false) then
      new.status := 'won';
      new.won_at := coalesce(new.won_at, now());
      new.lost_at := null;
      new.next_action_at := null;
    elsif coalesce(v_is_lost, false) then
      new.status := 'lost';
      new.lost_at := coalesce(new.lost_at, now());
      new.won_at := null;
      new.next_action_at := null;
    else
      new.status := 'open';
      new.won_at := null;
      new.lost_at := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_opportunities_sync_stage on public.opportunities;
create trigger trg_opportunities_sync_stage
  before insert or update on public.opportunities
  for each row execute function public.sync_opportunity_stage();

-- Trace le changement d'étape dans la timeline
create or replace function public.log_opportunity_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old text;
  v_new text;
begin
  if new.stage_id is distinct from old.stage_id then
    select label into v_old from public.pipeline_stages where id = old.stage_id;
    select label into v_new from public.pipeline_stages where id = new.stage_id;

    insert into public.crm_activities (
      company_id, opportunity_id, client_id, contact_id,
      type, direction, occurred_at, actor_id, subject, body, payload
    ) values (
      new.company_id, new.id, new.client_id, new.primary_contact_id,
      'stage_change', 'internal', now(), auth.uid(),
      coalesce(v_old, '—') || ' → ' || coalesce(v_new, '—'),
      new.lost_reason,
      jsonb_build_object('from_stage_id', old.stage_id, 'to_stage_id', new.stage_id,
                         'from_label', v_old, 'to_label', v_new)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_opportunities_log_stage on public.opportunities;
create trigger trg_opportunities_log_stage
  after update on public.opportunities
  for each row execute function public.log_opportunity_stage_change();

-- Toute activité rafraîchit last_activity_at de l'opportunité, du client et du contact
create or replace function public.touch_crm_last_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.opportunity_id is not null then
    update public.opportunities
       set last_activity_at = greatest(coalesce(last_activity_at, new.occurred_at), new.occurred_at)
     where id = new.opportunity_id;
  end if;
  if new.contact_id is not null then
    update public.contacts
       set last_activity_at = greatest(coalesce(last_activity_at, new.occurred_at), new.occurred_at)
     where id = new.contact_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_crm_activities_touch on public.crm_activities;
create trigger trg_crm_activities_touch
  after insert on public.crm_activities
  for each row execute function public.touch_crm_last_activity();

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 7) RLS — même pattern que le reste du repo
-- ---------------------------------------------------------------------------

alter table public.pipeline_stages enable row level security;
alter table public.contacts        enable row level security;
alter table public.opportunities   enable row level security;
alter table public.crm_activities  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['pipeline_stages','contacts','opportunities','crm_activities'] loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);

    -- Les portails client/ambassadeur n'ont rien à faire dans le CRM d'acquisition
    execute format($f$
      create policy %I_select on public.%I for select
        using ((company_id = get_user_company_id() and not is_client_user()) or is_admin_optimized())
    $f$, t, t);

    execute format($f$
      create policy %I_insert on public.%I for insert
        with check (company_id = get_user_company_id() and not is_client_user())
    $f$, t, t);

    execute format($f$
      create policy %I_update on public.%I for update
        using ((company_id = get_user_company_id() and not is_client_user()) or is_admin_optimized())
        with check ((company_id = get_user_company_id() and not is_client_user()) or is_admin_optimized())
    $f$, t, t);

    execute format($f$
      create policy %I_delete on public.%I for delete
        using ((company_id = get_user_company_id() and not is_client_user()) or is_admin_optimized())
    $f$, t, t);
  end loop;
end $$;

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 8) Backfill — l'existant devient du pipeline, rien ne se perd
--
-- Volontairement ABSENT de cette migration : créer une opportunité par offre
-- déclenche un trigger par ligne (sync_opportunity_stage) et dépasse le
-- statement_timeout. scripts/apply-crm-phase1.mjs le fait par lots.
-- ---------------------------------------------------------------------------

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 9) Projection de l'historique dans la timeline
--
-- Volontairement ABSENTE de cette migration : projeter tout l'historique
-- (emails IMAP, messages WhatsApp/SMS) dépasse le statement_timeout de
-- Postgres. scripts/apply-crm-phase1.mjs s'en charge par lots, trigger de
-- rafraîchissement de last_activity_at neutralisé le temps du backfill.
-- ---------------------------------------------------------------------------

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 10) Alimentation continue de la timeline
-- ---------------------------------------------------------------------------

-- Résout l'opportunité cible : celle de l'offre, sinon la dernière ouverte du client
create or replace function public.crm_resolve_opportunity(p_company_id uuid, p_offer_id uuid, p_client_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if p_offer_id is not null then
    select opportunity_id into v_id from public.offers where id = p_offer_id;
    if v_id is not null then return v_id; end if;
  end if;

  if p_client_id is not null then
    select id into v_id from public.opportunities
     where client_id = p_client_id
       and (p_company_id is null or company_id = p_company_id)
     order by (status = 'open') desc, created_at desc
     limit 1;
  end if;

  return v_id;
end;
$$;

create or replace function public.crm_project_offer_note()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_o record;
begin
  select company_id, client_id, opportunity_id into v_o from public.offers where id = new.offer_id;
  if v_o.company_id is null then return new; end if;
  insert into public.crm_activities (company_id, opportunity_id, client_id, offer_id, type, direction, occurred_at, actor_id, body, source_table, source_id)
  values (v_o.company_id, v_o.opportunity_id, v_o.client_id, new.offer_id, 'note', 'internal', new.created_at, new.created_by, new.content, 'offer_notes', new.id)
  on conflict do nothing;
  return new;
end; $$;

drop trigger if exists trg_offer_notes_to_crm on public.offer_notes;
create trigger trg_offer_notes_to_crm after insert on public.offer_notes
  for each row execute function public.crm_project_offer_note();

create or replace function public.crm_project_call_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_o record;
begin
  select client_id, opportunity_id into v_o from public.offers where id = new.offer_id;
  insert into public.crm_activities (company_id, opportunity_id, client_id, offer_id, type, direction, channel, occurred_at, actor_id, subject, body, outcome, payload, source_table, source_id)
  values (new.company_id, v_o.opportunity_id, v_o.client_id, new.offer_id, 'call', 'out', 'phone', new.called_at, new.created_by,
          case new.status when 'reached' then 'Contact établi' when 'voicemail' then 'Répondeur' else 'Sans réponse' end,
          new.notes, new.status, jsonb_build_object('callback_date', new.callback_date), 'offer_call_logs', new.id)
  on conflict do nothing;
  return new;
end; $$;

drop trigger if exists trg_offer_call_logs_to_crm on public.offer_call_logs;
create trigger trg_offer_call_logs_to_crm after insert on public.offer_call_logs
  for each row execute function public.crm_project_call_log();

create or replace function public.crm_project_voice_call()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- On projette à la fin de l'appel, quand le résumé existe
  if new.status not in ('completed','failed','no_answer','busy','canceled','voicemail','transferred_to_human') then
    return new;
  end if;
  insert into public.crm_activities (company_id, opportunity_id, client_id, offer_id, type, direction, channel, occurred_at, actor_id, actor_label, subject, body, outcome, payload, source_table, source_id)
  values (new.company_id,
          public.crm_resolve_opportunity(new.company_id, new.offer_id, new.client_id),
          new.client_id, new.offer_id, 'voice_ai',
          case when new.direction = 'inbound' then 'in' else 'out' end,
          'voice', coalesce(new.created_at, now()), new.initiated_by,
          case when new.initiated_by is null then 'Alex (IA)' else null end,
          coalesce(new.summary, 'Appel ' || coalesce(new.status, '')),
          new.transcription, new.outcome,
          jsonb_build_object('duration_seconds', new.duration_seconds, 'status', new.status, 'recording_url', new.recording_url),
          'voice_calls', new.id)
  on conflict (source_table, source_id) do update
    set subject = excluded.subject, body = excluded.body, outcome = excluded.outcome, payload = excluded.payload;
  return new;
end; $$;

drop trigger if exists trg_voice_calls_to_crm on public.voice_calls;
create trigger trg_voice_calls_to_crm after insert or update on public.voice_calls
  for each row execute function public.crm_project_voice_call();

create or replace function public.crm_project_synced_email()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_client uuid; v_opp uuid;
begin
  v_client := coalesce(new.linked_client_id,
                       (select client_id from public.offers where id = new.linked_offer_id));
  if v_client is null and new.linked_offer_id is null then return new; end if;

  v_opp := public.crm_resolve_opportunity(new.company_id, new.linked_offer_id, v_client);

  insert into public.crm_activities (company_id, opportunity_id, client_id, offer_id, type, direction, channel, occurred_at, subject, body, payload, source_table, source_id)
  values (new.company_id, v_opp, v_client, new.linked_offer_id, 'email', 'in', 'email',
          coalesce(new.received_at, new.created_at), new.subject, left(coalesce(new.body_text, ''), 4000),
          jsonb_build_object('from', new.from_address, 'from_name', new.from_name, 'to', new.to_address),
          'synced_emails', new.id)
  on conflict do nothing;
  return new;
end; $$;

drop trigger if exists trg_synced_emails_to_crm on public.synced_emails;
create trigger trg_synced_emails_to_crm after insert or update of linked_client_id, linked_offer_id on public.synced_emails
  for each row execute function public.crm_project_synced_email();

create or replace function public.crm_project_chat_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_conv record;
begin
  select company_id, client_id, channel into v_conv
    from public.chat_conversations where id = new.conversation_id;
  if v_conv.client_id is null then return new; end if;

  insert into public.crm_activities (company_id, opportunity_id, client_id, type, direction, channel, occurred_at, body, payload, source_table, source_id)
  values (v_conv.company_id,
          public.crm_resolve_opportunity(v_conv.company_id, null, v_conv.client_id),
          v_conv.client_id,
          case v_conv.channel when 'whatsapp' then 'whatsapp' when 'sms' then 'sms' else 'note' end,
          case when new.direction = 'inbound' then 'in' else 'out' end,
          coalesce(v_conv.channel, 'web'), new.created_at, new.message,
          jsonb_build_object('sender_name', new.sender_name, 'sender_type', new.sender_type, 'message_type', new.message_type),
          'chat_messages', new.id)
  on conflict do nothing;
  return new;
end; $$;

drop trigger if exists trg_chat_messages_to_crm on public.chat_messages;
create trigger trg_chat_messages_to_crm after insert on public.chat_messages
  for each row execute function public.crm_project_chat_message();
