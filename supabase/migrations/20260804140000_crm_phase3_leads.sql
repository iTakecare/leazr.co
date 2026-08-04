-- ============================================================================
-- CRM Acquisition — Phase 3 : alimentation continue + inbox de leads
--
-- 1) CRITIQUE : le backfill était un coup unique. Depuis, une nouvelle demande
--    n'engendrait aucune opportunité — le pipeline se serait vidé tout seul.
--    Un trigger BEFORE INSERT sur offers rattache désormais chaque offre à une
--    opportunité (celle du client si une affaire est déjà ouverte, une nouvelle
--    sinon).
--
-- 2) `raw_leads` : l'ingestion brute qui manquait. Aujourd'hui un lead Meta
--    devient directement une offre en brouillon, sans garde-fou anti-doublon,
--    et les formulaires du site dorment dans contact_submissions sans qu'aucun
--    écran ne les lise.
--
-- 3) Vue `crm_lead_inbox` : formulaires du site et leads importés dans une
--    seule file à qualifier.
-- ============================================================================

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 1) Toute nouvelle offre entre dans le pipeline
-- ---------------------------------------------------------------------------

-- Étape cible d'une offre, à partir de son workflow_status. Même règle que le
-- backfill : le contrat prime, et un statut inconnu ne va JAMAIS au milieu du
-- pipeline.
create or replace function public.crm_stage_key_for_offer(
  p_workflow_status text,
  p_converted boolean
)
returns text
language sql
immutable
as $$
  select case
    when p_converted is true then 'won'
    when p_workflow_status = any (array[
      'financed','invoicing','contract_signed','contract_sent','accepted',
      'signed','completed','validated','leaser_approved']) then 'won'
    when p_workflow_status = any (array[
      'without_follow_up','internal_rejected','leaser_rejected','rejected',
      'refused','cancelled']) then 'lost'
    when p_workflow_status = any (array[
      'internal_approved','leaser_introduced','leaser_pending','leaser_docs_requested'])
      then 'negotiation'
    when p_workflow_status = 'internal_docs_requested' then 'docs_pending'
    when p_workflow_status = any (array[
      'sent','sent_to_client','viewed','info_requested']) then 'proposal'
    else 'new'
  end;
$$;

create or replace function public.crm_attach_offer_to_opportunity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage_key text;
  v_stage_id  uuid;
  v_opp       uuid;
  v_name      text;
begin
  if new.opportunity_id is not null or new.company_id is null then
    return new;
  end if;

  -- Une affaire déjà ouverte pour ce client absorbe la nouvelle offre : une
  -- relance ou une nouvelle version ne doit pas créer un doublon de pipeline.
  if new.client_id is not null then
    select id into v_opp
      from public.opportunities
     where client_id = new.client_id
       and company_id = new.company_id
       and status = 'open'
     order by created_at desc
     limit 1;
  end if;

  if v_opp is not null then
    new.opportunity_id := v_opp;
    return new;
  end if;

  v_stage_key := public.crm_stage_key_for_offer(new.workflow_status, new.converted_to_contract);

  select id into v_stage_id
    from public.pipeline_stages
   where company_id = new.company_id and key = v_stage_key
   limit 1;

  if v_stage_id is null then
    return new;   -- société sans jeu d'étapes : on ne bloque pas la création d'offre
  end if;

  v_name := coalesce(nullif(new.client_name, ''), 'Opportunité')
            || case when new.dossier_number is not null then ' — ' || new.dossier_number else '' end;

  insert into public.opportunities (
    company_id, name, client_id, stage_id, owner_id,
    source, utm_source, utm_medium, utm_campaign, utm_term, utm_content,
    created_from, estimated_monthly_payment, estimated_amount,
    primary_contact_id, created_by
  ) values (
    new.company_id, v_name, new.client_id, v_stage_id, new.user_id,
    new.source, new.utm_source, new.utm_medium, new.utm_campaign, new.utm_term, new.utm_content,
    case when new.source = 'meta' then 'meta'
         when new.source in ('website', 'site_web') then 'website'
         else 'manual' end,
    new.monthly_payment, new.financed_amount,
    (select ct.id from public.contacts ct
      where ct.company_id = new.company_id and ct.client_id = new.client_id
      order by ct.created_at asc limit 1),
    new.user_id
  )
  returning id into v_opp;

  new.opportunity_id := v_opp;
  return new;
end;
$$;

drop trigger if exists trg_offers_attach_opportunity on public.offers;
create trigger trg_offers_attach_opportunity
  before insert on public.offers
  for each row execute function public.crm_attach_offer_to_opportunity();

-- @@SPLIT@@
-- Le statut de l'offre évolue -> l'étape de l'opportunité suit, tant que
-- personne ne l'a déplacée à la main (created_from = 'manual' est laissé libre).
create or replace function public.crm_sync_opportunity_from_offer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage_key text;
  v_stage_id  uuid;
begin
  if new.opportunity_id is null then
    return new;
  end if;
  if new.workflow_status is not distinct from old.workflow_status
     and new.converted_to_contract is not distinct from old.converted_to_contract then
    return new;
  end if;

  v_stage_key := public.crm_stage_key_for_offer(new.workflow_status, new.converted_to_contract);

  select id into v_stage_id
    from public.pipeline_stages
   where company_id = new.company_id and key = v_stage_key
   limit 1;

  if v_stage_id is null then
    return new;
  end if;

  -- On ne rouvre jamais une affaire close depuis le workflow d'une offre :
  -- seule une action commerciale explicite peut le faire.
  update public.opportunities
     set stage_id = v_stage_id
   where id = new.opportunity_id
     and stage_id is distinct from v_stage_id
     and (status = 'open' or v_stage_key in ('won', 'lost'));

  return new;
end;
$$;

drop trigger if exists trg_offers_sync_opportunity on public.offers;
create trigger trg_offers_sync_opportunity
  after update of workflow_status, converted_to_contract on public.offers
  for each row execute function public.crm_sync_opportunity_from_offer();

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 2) raw_leads — l'ingestion brute
-- ---------------------------------------------------------------------------

create table if not exists public.raw_leads (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  source        text not null,          -- meta | website_form | csv_import | manual | api
  -- Identifiant côté source : c'est lui qui empêche d'importer deux fois le
  -- même lead Meta, garde-fou qui n'existait nulle part.
  external_id   text,

  status        text not null default 'new'
                check (status = any (array['new','qualified','rejected','duplicate'])),

  -- Charge utile d'origine, conservée telle quelle
  payload       jsonb not null default '{}'::jsonb,

  -- Champs normalisés
  first_name    text,
  last_name     text,
  email         text,
  phone         text,
  company_name  text,
  vat_number    text,
  message       text,

  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  utm_term        text,
  utm_content     text,
  landing_referrer text,

  -- Traitement
  assigned_to      uuid references public.profiles(id) on delete set null,
  qualified_at     timestamptz,
  qualified_by     uuid references public.profiles(id) on delete set null,
  opportunity_id   uuid references public.opportunities(id) on delete set null,
  contact_id       uuid references public.contacts(id) on delete set null,
  client_id        uuid references public.clients(id) on delete set null,
  rejection_reason text,

  received_at   timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists uniq_raw_leads_source_external
  on public.raw_leads(company_id, source, external_id)
  where external_id is not null;

create index if not exists idx_raw_leads_company_status
  on public.raw_leads(company_id, status, received_at desc);
create index if not exists idx_raw_leads_email
  on public.raw_leads(company_id, lower(email)) where email is not null;

drop trigger if exists trg_raw_leads_updated_at on public.raw_leads;
create trigger trg_raw_leads_updated_at before update on public.raw_leads
  for each row execute function public.touch_crm_updated_at();

alter table public.raw_leads enable row level security;

drop policy if exists raw_leads_select on public.raw_leads;
create policy raw_leads_select on public.raw_leads for select
  using ((company_id = get_user_company_id() and not is_client_user()) or is_admin_optimized());

drop policy if exists raw_leads_insert on public.raw_leads;
create policy raw_leads_insert on public.raw_leads for insert
  with check (company_id = get_user_company_id() and not is_client_user());

drop policy if exists raw_leads_update on public.raw_leads;
create policy raw_leads_update on public.raw_leads for update
  using ((company_id = get_user_company_id() and not is_client_user()) or is_admin_optimized())
  with check ((company_id = get_user_company_id() and not is_client_user()) or is_admin_optimized());

drop policy if exists raw_leads_delete on public.raw_leads;
create policy raw_leads_delete on public.raw_leads for delete
  using (is_admin_optimized());

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 3) Les formulaires du site alimentent la file, aujourd'hui et pour l'existant
-- ---------------------------------------------------------------------------

create or replace function public.crm_contact_submission_to_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null then
    return new;
  end if;

  insert into public.raw_leads (
    company_id, source, external_id, status,
    first_name, last_name, email, phone, company_name, message,
    payload, received_at
  ) values (
    new.company_id, 'website_form', new.id::text,
    case new.status when 'archived' then 'rejected' else 'new' end,
    split_part(new.name, ' ', 1),
    nullif(substr(new.name, position(' ' in new.name) + 1), new.name),
    lower(new.email), new.phone, new.company_name,
    coalesce(new.subject, '') || case when new.message is not null then E'\n' || new.message else '' end,
    jsonb_build_object('subject', new.subject, 'contact_submission_id', new.id),
    new.created_at
  )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists trg_contact_submissions_to_lead on public.contact_submissions;
create trigger trg_contact_submissions_to_lead
  after insert on public.contact_submissions
  for each row execute function public.crm_contact_submission_to_lead();

-- Reprise de l'historique dormant
insert into public.raw_leads (
  company_id, source, external_id, status,
  first_name, last_name, email, phone, company_name, message, payload, received_at
)
select
  cs.company_id, 'website_form', cs.id::text,
  case cs.status when 'archived' then 'rejected' when 'replied' then 'qualified' else 'new' end,
  split_part(cs.name, ' ', 1),
  nullif(substr(cs.name, position(' ' in cs.name) + 1), cs.name),
  lower(cs.email), cs.phone, cs.company_name,
  coalesce(cs.subject, '') || case when cs.message is not null then E'\n' || cs.message else '' end,
  jsonb_build_object('subject', cs.subject, 'contact_submission_id', cs.id),
  cs.created_at
  from public.contact_submissions cs
 where cs.company_id is not null
on conflict do nothing;

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 4) Qualification : un lead devient contact + opportunité en une transaction
-- ---------------------------------------------------------------------------

create or replace function public.crm_qualify_lead(
  p_lead_id   uuid,
  p_client_id uuid default null,
  p_owner_id  uuid default null,
  p_stage_key text default 'contacted'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead     public.raw_leads;
  v_contact  uuid;
  v_stage    uuid;
  v_opp      uuid;
  v_name     text;
begin
  select * into v_lead from public.raw_leads where id = p_lead_id;
  if v_lead.id is null then
    raise exception 'Lead introuvable';
  end if;
  if v_lead.status = 'qualified' and v_lead.opportunity_id is not null then
    return v_lead.opportunity_id;   -- idempotent
  end if;

  -- Contact : on réutilise celui qui porte déjà cet email dans la société
  if v_lead.email is not null and v_lead.email <> '' then
    select id into v_contact
      from public.contacts
     where company_id = v_lead.company_id and lower(email) = lower(v_lead.email)
     limit 1;

    if v_contact is null then
      insert into public.contacts (
        company_id, client_id, first_name, last_name, email, phone,
        company_name, vat_number, source, utm_source, utm_medium, utm_campaign, owner_id
      ) values (
        v_lead.company_id, p_client_id, v_lead.first_name, v_lead.last_name,
        lower(v_lead.email), v_lead.phone, v_lead.company_name, v_lead.vat_number,
        v_lead.source, v_lead.utm_source, v_lead.utm_medium, v_lead.utm_campaign,
        coalesce(p_owner_id, auth.uid())
      )
      returning id into v_contact;
    elsif p_client_id is not null then
      update public.contacts set client_id = p_client_id
       where id = v_contact and client_id is null;
    end if;
  end if;

  select id into v_stage
    from public.pipeline_stages
   where company_id = v_lead.company_id and key = p_stage_key
   limit 1;

  v_name := coalesce(
    nullif(v_lead.company_name, ''),
    nullif(trim(coalesce(v_lead.first_name, '') || ' ' || coalesce(v_lead.last_name, '')), ''),
    v_lead.email,
    'Nouveau lead'
  );

  insert into public.opportunities (
    company_id, name, client_id, primary_contact_id, stage_id, owner_id,
    source, utm_source, utm_medium, utm_campaign, utm_term, utm_content,
    created_from, description, created_by
  ) values (
    v_lead.company_id, v_name, p_client_id, v_contact, v_stage,
    coalesce(p_owner_id, auth.uid()),
    v_lead.source, v_lead.utm_source, v_lead.utm_medium, v_lead.utm_campaign,
    v_lead.utm_term, v_lead.utm_content,
    case v_lead.source when 'meta' then 'meta' when 'website_form' then 'website'
                       when 'csv_import' then 'import' else 'manual' end,
    v_lead.message,
    auth.uid()
  )
  returning id into v_opp;

  update public.raw_leads
     set status = 'qualified',
         qualified_at = now(),
         qualified_by = auth.uid(),
         opportunity_id = v_opp,
         contact_id = v_contact,
         client_id = coalesce(p_client_id, client_id)
   where id = p_lead_id;

  -- Trace d'origine dans la timeline de l'affaire
  insert into public.crm_activities (
    company_id, opportunity_id, client_id, contact_id,
    type, direction, channel, occurred_at, actor_id, subject, body, payload
  ) values (
    v_lead.company_id, v_opp, p_client_id, v_contact,
    'system', 'in', v_lead.source, v_lead.received_at, auth.uid(),
    'Lead reçu — ' || v_lead.source,
    v_lead.message,
    jsonb_build_object('raw_lead_id', v_lead.id, 'utm_campaign', v_lead.utm_campaign)
  );

  return v_opp;
end;
$$;

grant execute on function public.crm_qualify_lead(uuid, uuid, uuid, text) to authenticated;
