-- ============================================================================
-- CRM Acquisition — Phase 4 : séquences multi-canal (cadences)
--
-- C'est la brique qui transforme le suivi en machine de chasse. Jusqu'ici les
-- seules relances automatisables étaient `offer_reminders` (3 niveaux figés,
-- déclenchés à la main) et `voice_campaigns` (mono-canal, alimenté uniquement
-- par des offres à documents manquants).
--
-- Deux besoins mesurés sur les données réelles :
--   * 152 leads Meta partis « sans suite » faute d'un premier contact rapide
--     → déclencheur `lead_created` qui part dans la minute
--   * 212 affaires perdues faute de réponse, encore récupérables
--     → déclencheur `tag_added` sur le tag `reactivation`
--
-- Le dispatcher (edge `sequence-dispatch`, cron toutes les 5 min) réutilise
-- l'infra d'envoi existante : send-resend-email, messaging-send (WhatsApp avec
-- repli SMS), voice-call-start, ou une tâche pour un appel humain.
-- ============================================================================

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 1) Séquences et leurs étapes
-- ---------------------------------------------------------------------------

create table if not exists public.sequences (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  name         text not null,
  description  text,

  status       text not null default 'draft'
               check (status = any (array['draft','active','paused'])),

  -- Déclenchement. `trigger_config` porte le critère :
  --   lead_created  -> {"source": "meta"}
  --   stage_entered -> {"stage_key": "proposal"}
  --   tag_added     -> {"tag": "reactivation"}
  trigger_type   text not null default 'manual'
                 check (trigger_type = any (array['manual','lead_created','stage_entered','tag_added'])),
  trigger_config jsonb not null default '{}'::jsonb,

  -- Conditions d'arrêt : une séquence qui continue après une réponse du
  -- prospect est le meilleur moyen de le perdre pour de bon.
  stop_on_reply        boolean not null default true,
  stop_on_stage_change boolean not null default true,
  -- N'envoyer qu'en heures ouvrées (08:00-18:00, lundi-vendredi, Europe/Brussels)
  business_hours_only  boolean not null default true,

  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_sequences_company on public.sequences(company_id, status);
create index if not exists idx_sequences_trigger on public.sequences(trigger_type, status)
  where status = 'active';

create table if not exists public.sequence_steps (
  id            uuid primary key default gen_random_uuid(),
  sequence_id   uuid not null references public.sequences(id) on delete cascade,
  position      int not null,
  -- Délai depuis l'étape précédente (0 pour la première = envoi immédiat)
  delay_minutes int not null default 0,

  channel       text not null
                check (channel = any (array['email','whatsapp','sms','call_task','voice_ai'])),

  subject       text,           -- email
  body          text,           -- email / whatsapp / sms / consigne de la tâche
  template_key  text,           -- clé de template WhatsApp (messaging_settings.templates)
  assigned_to   uuid references public.profiles(id) on delete set null,  -- call_task

  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (sequence_id, position)
);

create index if not exists idx_sequence_steps_sequence on public.sequence_steps(sequence_id, position);

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 2) Inscriptions et exécutions
-- ---------------------------------------------------------------------------

create table if not exists public.sequence_enrollments (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  sequence_id    uuid not null references public.sequences(id) on delete cascade,

  opportunity_id uuid references public.opportunities(id) on delete cascade,
  contact_id     uuid references public.contacts(id) on delete cascade,
  client_id      uuid references public.clients(id) on delete set null,

  status         text not null default 'active'
                 check (status = any (array['active','completed','stopped','failed'])),
  current_step   int not null default 0,       -- position de la dernière étape exécutée
  next_run_at    timestamptz,
  stopped_reason text,

  enrolled_by    uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Une même affaire ne peut pas être inscrite deux fois dans la même séquence
create unique index if not exists uniq_enrollment_sequence_opportunity
  on public.sequence_enrollments(sequence_id, opportunity_id)
  where opportunity_id is not null;
create unique index if not exists uniq_enrollment_sequence_contact
  on public.sequence_enrollments(sequence_id, contact_id)
  where opportunity_id is null and contact_id is not null;

-- Index de travail du dispatcher
create index if not exists idx_enrollments_due
  on public.sequence_enrollments(next_run_at)
  where status = 'active';
create index if not exists idx_enrollments_company on public.sequence_enrollments(company_id, status);
create index if not exists idx_enrollments_opportunity on public.sequence_enrollments(opportunity_id);

create table if not exists public.sequence_step_runs (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  enrollment_id uuid not null references public.sequence_enrollments(id) on delete cascade,
  step_id       uuid references public.sequence_steps(id) on delete set null,

  status        text not null default 'pending'
                check (status = any (array['pending','sent','failed','skipped'])),
  scheduled_at  timestamptz,
  sent_at       timestamptz,
  error         text,
  activity_id   uuid references public.crm_activities(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_step_runs_enrollment on public.sequence_step_runs(enrollment_id, created_at desc);

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 3) updated_at + RLS
-- ---------------------------------------------------------------------------

drop trigger if exists trg_sequences_updated_at on public.sequences;
create trigger trg_sequences_updated_at before update on public.sequences
  for each row execute function public.touch_crm_updated_at();

drop trigger if exists trg_sequence_steps_updated_at on public.sequence_steps;
create trigger trg_sequence_steps_updated_at before update on public.sequence_steps
  for each row execute function public.touch_crm_updated_at();

drop trigger if exists trg_sequence_enrollments_updated_at on public.sequence_enrollments;
create trigger trg_sequence_enrollments_updated_at before update on public.sequence_enrollments
  for each row execute function public.touch_crm_updated_at();

alter table public.sequences            enable row level security;
alter table public.sequence_steps       enable row level security;
alter table public.sequence_enrollments enable row level security;
alter table public.sequence_step_runs   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['sequences','sequence_enrollments','sequence_step_runs'] loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('drop policy if exists %I_all on public.%I', t, t);
    execute format($f$
      create policy %I_select on public.%I for select
        using ((company_id = get_user_company_id() and not is_client_user()) or is_admin_optimized())
    $f$, t, t);
    execute format($f$
      create policy %I_all on public.%I for all
        using ((company_id = get_user_company_id() and not is_client_user()) or is_admin_optimized())
        with check ((company_id = get_user_company_id() and not is_client_user()) or is_admin_optimized())
    $f$, t, t);
  end loop;
end $$;

-- sequence_steps n'a pas de company_id : on passe par la séquence parente
drop policy if exists sequence_steps_select on public.sequence_steps;
create policy sequence_steps_select on public.sequence_steps for select
  using (exists (
    select 1 from public.sequences s
     where s.id = sequence_id
       and ((s.company_id = get_user_company_id() and not is_client_user()) or is_admin_optimized())
  ));

drop policy if exists sequence_steps_all on public.sequence_steps;
create policy sequence_steps_all on public.sequence_steps for all
  using (exists (
    select 1 from public.sequences s
     where s.id = sequence_id
       and ((s.company_id = get_user_company_id() and not is_client_user()) or is_admin_optimized())
  ))
  with check (exists (
    select 1 from public.sequences s
     where s.id = sequence_id
       and ((s.company_id = get_user_company_id() and not is_client_user()) or is_admin_optimized())
  ));

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 4) Inscription : une fonction unique, appelée à la main comme par les
--    déclencheurs automatiques
-- ---------------------------------------------------------------------------

create or replace function public.crm_enroll_in_sequence(
  p_sequence_id    uuid,
  p_opportunity_id uuid default null,
  p_contact_id     uuid default null,
  p_enrolled_by    uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq        public.sequences;
  v_first_step public.sequence_steps;
  v_company    uuid;
  v_client     uuid;
  v_contact    uuid := p_contact_id;
  v_enrollment uuid;
begin
  select * into v_seq from public.sequences where id = p_sequence_id;
  if v_seq.id is null or v_seq.status <> 'active' then
    return null;   -- une séquence en brouillon ou en pause n'inscrit personne
  end if;

  if p_opportunity_id is not null then
    select company_id, client_id, primary_contact_id
      into v_company, v_client, v_contact
      from public.opportunities where id = p_opportunity_id;
    v_contact := coalesce(p_contact_id, v_contact);
  elsif p_contact_id is not null then
    select company_id, client_id into v_company, v_client
      from public.contacts where id = p_contact_id;
  else
    return null;
  end if;

  if v_company is null or v_company <> v_seq.company_id then
    return null;
  end if;

  select * into v_first_step
    from public.sequence_steps
   where sequence_id = p_sequence_id and active
   order by position asc
   limit 1;

  if v_first_step.id is null then
    return null;   -- séquence sans étape : rien à programmer
  end if;

  insert into public.sequence_enrollments (
    company_id, sequence_id, opportunity_id, contact_id, client_id,
    status, current_step, next_run_at, enrolled_by
  ) values (
    v_company, p_sequence_id, p_opportunity_id, v_contact, v_client,
    'active', 0,
    now() + make_interval(mins => v_first_step.delay_minutes),
    coalesce(p_enrolled_by, auth.uid())
  )
  on conflict do nothing
  returning id into v_enrollment;

  return v_enrollment;
end;
$$;

grant execute on function public.crm_enroll_in_sequence(uuid, uuid, uuid, uuid) to authenticated;

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 5) Arrêt automatique
-- ---------------------------------------------------------------------------

-- Une réponse entrante coupe la séquence : c'est la règle qui évite de
-- continuer à relancer quelqu'un qui vient de répondre.
create or replace function public.crm_stop_sequences_on_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.direction <> 'in' or new.opportunity_id is null then
    return new;
  end if;

  update public.sequence_enrollments e
     set status = 'stopped',
         stopped_reason = 'reply_received',
         next_run_at = null
    from public.sequences s
   where s.id = e.sequence_id
     and e.opportunity_id = new.opportunity_id
     and e.status = 'active'
     and s.stop_on_reply;

  return new;
end;
$$;

drop trigger if exists trg_crm_activities_stop_sequences on public.crm_activities;
create trigger trg_crm_activities_stop_sequences
  after insert on public.crm_activities
  for each row execute function public.crm_stop_sequences_on_reply();

-- Changement d'étape ou clôture : idem
create or replace function public.crm_stop_sequences_on_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stage_id is not distinct from old.stage_id then
    return new;
  end if;

  update public.sequence_enrollments e
     set status = 'stopped',
         stopped_reason = case when new.status <> 'open' then 'opportunity_closed' else 'stage_changed' end,
         next_run_at = null
    from public.sequences s
   where s.id = e.sequence_id
     and e.opportunity_id = new.id
     and e.status = 'active'
     and (s.stop_on_stage_change or new.status <> 'open');

  return new;
end;
$$;

drop trigger if exists trg_opportunities_stop_sequences on public.opportunities;
create trigger trg_opportunities_stop_sequences
  after update on public.opportunities
  for each row execute function public.crm_stop_sequences_on_stage_change();

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 6) Déclencheurs automatiques
-- ---------------------------------------------------------------------------

-- Une opportunité qui naît inscrit d'office dans les séquences `lead_created`
-- dont la source correspond. C'est la réponse au problème mesuré : 152 leads
-- Meta perdus faute d'un premier contact assez rapide.
create or replace function public.crm_autoenroll_new_opportunity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq record;
begin
  for v_seq in
    select id, trigger_config
      from public.sequences
     where company_id = new.company_id
       and status = 'active'
       and trigger_type = 'lead_created'
  loop
    -- Pas de filtre de source, ou source correspondante
    if v_seq.trigger_config->>'source' is null
       or v_seq.trigger_config->>'source' = new.source
       or v_seq.trigger_config->>'source' = new.created_from then
      perform public.crm_enroll_in_sequence(v_seq.id, new.id, null, new.created_by);
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_opportunities_autoenroll on public.opportunities;
create trigger trg_opportunities_autoenroll
  after insert on public.opportunities
  for each row execute function public.crm_autoenroll_new_opportunity();

-- Entrée dans une étape, et ajout d'un tag (segment `reactivation`)
create or replace function public.crm_autoenroll_on_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq record;
  v_stage_key text;
begin
  if new.stage_id is distinct from old.stage_id then
    select key into v_stage_key from public.pipeline_stages where id = new.stage_id;
    for v_seq in
      select id, trigger_config from public.sequences
       where company_id = new.company_id and status = 'active' and trigger_type = 'stage_entered'
    loop
      if v_seq.trigger_config->>'stage_key' = v_stage_key then
        perform public.crm_enroll_in_sequence(v_seq.id, new.id, null, null);
      end if;
    end loop;
  end if;

  if new.tags is distinct from old.tags then
    for v_seq in
      select id, trigger_config from public.sequences
       where company_id = new.company_id and status = 'active' and trigger_type = 'tag_added'
    loop
      if v_seq.trigger_config->>'tag' is not null
         and new.tags @> array[v_seq.trigger_config->>'tag']
         and not (coalesce(old.tags, '{}') @> array[v_seq.trigger_config->>'tag']) then
        perform public.crm_enroll_in_sequence(v_seq.id, new.id, null, null);
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_opportunities_autoenroll_change on public.opportunities;
create trigger trg_opportunities_autoenroll_change
  after update on public.opportunities
  for each row execute function public.crm_autoenroll_on_change();

-- @@SPLIT@@
-- ---------------------------------------------------------------------------
-- 7) Cron du dispatcher — toutes les 5 minutes
--    Authentifié par le service_role (pas de secret dédié à provisionner) ;
--    <SERVICE_ROLE_KEY> est substitué à l'application par le script.
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$ begin perform cron.unschedule('sequence-dispatch'); exception when others then null; end $$;

select cron.schedule(
  'sequence-dispatch',
  '*/5 * * * *',
  $cron$
  select net.http_post(
    url := 'https://cifbetjefyfocafanlhv.supabase.co/functions/v1/sequence-dispatch',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer <SERVICE_ROLE_KEY>'
    ),
    body := jsonb_build_object('source','cron')
  );
  $cron$
);
