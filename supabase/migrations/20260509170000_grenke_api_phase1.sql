-- Grenke Leasing API integration — Phase 1
-- Adds: per-tenant cert storage (Vault), reference data cache,
-- offer-side tracking columns, helper RPCs.
-- Safe to re-run: every block is guarded by IF NOT EXISTS / DO blocks.
-- Reference: docs/grenke-api/INTEGRATION.md

-- ---------------------------------------------------------------------------
-- 1. Vault extension (Supabase ships with it but extension may not be enabled)
-- ---------------------------------------------------------------------------
create extension if not exists "supabase_vault" with schema vault cascade;

-- ---------------------------------------------------------------------------
-- 2. Allow 'grenke' in company_integrations.integration_type
-- ---------------------------------------------------------------------------
alter table public.company_integrations
  drop constraint if exists company_integrations_integration_type_check;

alter table public.company_integrations
  add constraint company_integrations_integration_type_check
  check (integration_type in ('billit', 'other', 'netlify', 'grenke'));

-- ---------------------------------------------------------------------------
-- 3. Track Grenke-side submission state on offers
-- ---------------------------------------------------------------------------
alter table public.offers
  add column if not exists grenke_financing_id     uuid,
  add column if not exists grenke_request_id       text,
  add column if not exists grenke_state            text,
  add column if not exists grenke_environment      text,
  add column if not exists grenke_submitted_at     timestamptz,
  add column if not exists grenke_state_updated_at timestamptz,
  add column if not exists grenke_last_error       jsonb;

-- Partial index — we only ever need to look at non-terminal Grenke offers
-- when polling for status updates.
create index if not exists offers_grenke_active_idx
  on public.offers(grenke_state)
  where grenke_state is not null
    and grenke_state not in ('Contracted', 'Declined', 'Cancelled');

-- ---------------------------------------------------------------------------
-- 4. Reference-data cache (legalforms / objecttypes / customslas)
-- ---------------------------------------------------------------------------
create table if not exists public.grenke_reference_data (
  company_id  uuid not null references public.companies(id) on delete cascade,
  environment text not null check (environment in ('uat', 'production')),
  kind        text not null check (kind in ('legalforms', 'objecttypes', 'customslas')),
  payload     jsonb not null,
  fetched_at  timestamptz not null default now(),
  primary key (company_id, environment, kind)
);

alter table public.grenke_reference_data enable row level security;

drop policy if exists "grenke_reference_data_company_access" on public.grenke_reference_data;
create policy "grenke_reference_data_company_access"
  on public.grenke_reference_data
  for all
  using (company_id = public.get_user_company_id() or public.is_admin_optimized());

-- ---------------------------------------------------------------------------
-- 5. RPC — get_grenke_credentials (read cert+key from Vault)
--    Called by the grenke-api edge function with service_role.
--    Also callable by company admins (used by UI "Test connection").
-- ---------------------------------------------------------------------------
create or replace function public.get_grenke_credentials(
  p_company_id uuid,
  p_environment text
)
returns table (cert_pem text, key_pem text)
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_settings          jsonb;
  v_cert_secret_name  text;
  v_key_secret_name   text;
begin
  -- Caller must be service_role OR a company admin of p_company_id
  if auth.role() <> 'service_role'
     and not exists (
       select 1 from public.profiles
       where id = auth.uid()
         and company_id = p_company_id
     )
     and not public.is_admin_optimized()
  then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if p_environment not in ('uat', 'production') then
    raise exception 'invalid environment: %', p_environment using errcode = '22023';
  end if;

  select settings into v_settings
  from public.company_integrations
  where company_id = p_company_id
    and integration_type = 'grenke';

  v_cert_secret_name := v_settings #>> array['environments', p_environment, 'cert_secret_name'];
  v_key_secret_name  := v_settings #>> array['environments', p_environment, 'key_secret_name'];

  if v_cert_secret_name is null or v_key_secret_name is null then
    return; -- empty result set: caller treats this as "credentials not configured"
  end if;

  return query
  select
    (select decrypted_secret
       from vault.decrypted_secrets
      where name = v_cert_secret_name
      limit 1) as cert_pem,
    (select decrypted_secret
       from vault.decrypted_secrets
      where name = v_key_secret_name
      limit 1) as key_pem;
end;
$$;

revoke all on function public.get_grenke_credentials(uuid, text) from public;
grant execute on function public.get_grenke_credentials(uuid, text) to authenticated;
grant execute on function public.get_grenke_credentials(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 6. RPC — set_grenke_credentials (upsert cert+key into Vault)
--    Used by Settings UI when an admin uploads the signed certificate.
-- ---------------------------------------------------------------------------
create or replace function public.set_grenke_credentials(
  p_company_id  uuid,
  p_environment text,
  p_cert_pem    text,
  p_key_pem     text
)
returns jsonb
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_cert_secret_name text;
  v_key_secret_name  text;
  v_cert_id          uuid;
  v_key_id           uuid;
  v_existing_settings jsonb;
begin
  -- Only admins of the target company can set credentials
  if not exists (
       select 1 from public.profiles
       where id = auth.uid()
         and company_id = p_company_id
     )
     and not public.is_admin_optimized()
  then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if p_environment not in ('uat', 'production') then
    raise exception 'invalid environment: %', p_environment using errcode = '22023';
  end if;

  -- Basic PEM sanity check — better to fail fast than store garbage
  if p_cert_pem !~ '-----BEGIN CERTIFICATE-----' then
    raise exception 'cert_pem does not look like a PEM certificate' using errcode = '22023';
  end if;
  if p_key_pem !~ '-----BEGIN (RSA |EC |ENCRYPTED |)PRIVATE KEY-----' then
    raise exception 'key_pem does not look like a PEM private key' using errcode = '22023';
  end if;

  v_cert_secret_name := 'grenke_' || p_environment || '_cert_' || replace(p_company_id::text, '-', '');
  v_key_secret_name  := 'grenke_' || p_environment || '_key_'  || replace(p_company_id::text, '-', '');

  -- Upsert cert
  select id into v_cert_id from vault.secrets where name = v_cert_secret_name;
  if v_cert_id is null then
    perform vault.create_secret(p_cert_pem, v_cert_secret_name,
      'GRENKE Leasing API client cert (' || p_environment || ') for company ' || p_company_id::text);
  else
    perform vault.update_secret(v_cert_id, p_cert_pem);
  end if;

  -- Upsert key
  select id into v_key_id from vault.secrets where name = v_key_secret_name;
  if v_key_id is null then
    perform vault.create_secret(p_key_pem, v_key_secret_name,
      'GRENKE Leasing API client private key (' || p_environment || ') for company ' || p_company_id::text);
  else
    perform vault.update_secret(v_key_id, p_key_pem);
  end if;

  -- Update or insert into company_integrations (non-secret config only)
  insert into public.company_integrations (
    company_id, integration_type, is_enabled, settings
  ) values (
    p_company_id, 'grenke', true,
    jsonb_build_object(
      'environments', jsonb_build_object(
        p_environment, jsonb_build_object(
          'cert_secret_name', v_cert_secret_name,
          'key_secret_name',  v_key_secret_name,
          'configured_at',    now()
        )
      )
    )
  )
  on conflict (company_id, integration_type) do update
  set settings = jsonb_set(
        coalesce(public.company_integrations.settings, '{}'::jsonb),
        array['environments', p_environment],
        jsonb_build_object(
          'cert_secret_name', v_cert_secret_name,
          'key_secret_name',  v_key_secret_name,
          'configured_at',    now()
        ),
        true
      ),
      is_enabled = true,
      updated_at = now();

  return jsonb_build_object(
    'success', true,
    'environment', p_environment,
    'cert_secret_name', v_cert_secret_name,
    'key_secret_name',  v_key_secret_name
  );
end;
$$;

revoke all on function public.set_grenke_credentials(uuid, text, text, text) from public;
grant execute on function public.set_grenke_credentials(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. RPC — get_grenke_integration_status (UI helper, no secrets exposed)
-- ---------------------------------------------------------------------------
create or replace function public.get_grenke_integration_status(p_company_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_uat_configured  boolean := false;
  v_prod_configured boolean := false;
begin
  if not exists (
       select 1 from public.profiles
       where id = auth.uid()
         and company_id = p_company_id
     )
     and not public.is_admin_optimized()
  then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select is_enabled, settings, updated_at
    into v_row
    from public.company_integrations
   where company_id = p_company_id and integration_type = 'grenke';

  if not found then
    return jsonb_build_object(
      'configured', false,
      'is_enabled', false,
      'environments', jsonb_build_object('uat', false, 'production', false)
    );
  end if;

  v_uat_configured  := (v_row.settings #>> array['environments','uat','cert_secret_name']) is not null;
  v_prod_configured := (v_row.settings #>> array['environments','production','cert_secret_name']) is not null;

  return jsonb_build_object(
    'configured', v_uat_configured or v_prod_configured,
    'is_enabled', v_row.is_enabled,
    'updated_at', v_row.updated_at,
    'environments', jsonb_build_object(
      'uat', v_uat_configured,
      'production', v_prod_configured
    ),
    'uat_configured_at',  v_row.settings #>> array['environments','uat','configured_at'],
    'prod_configured_at', v_row.settings #>> array['environments','production','configured_at']
  );
end;
$$;

revoke all on function public.get_grenke_integration_status(uuid) from public;
grant execute on function public.get_grenke_integration_status(uuid) to authenticated;
