-- Tulip insurance API integration — Phase 1 (scaffold, awaiting API doc)
-- Adds: per-tenant API key storage (Vault), helper RPCs.
-- Mirrors the Grenke integration's secret-handling pattern, but for a simple
-- per-environment API key instead of an mTLS cert pair.
-- Safe to re-run: every block is guarded by IF NOT EXISTS / OR REPLACE / DO.

-- ---------------------------------------------------------------------------
-- 1. Vault extension (Supabase ships with it but extension may not be enabled)
-- ---------------------------------------------------------------------------
create extension if not exists "supabase_vault" with schema vault cascade;

-- ---------------------------------------------------------------------------
-- 2. Allow 'tulip' in company_integrations.integration_type
-- ---------------------------------------------------------------------------
alter table public.company_integrations
  drop constraint if exists company_integrations_integration_type_check;

alter table public.company_integrations
  add constraint company_integrations_integration_type_check
  check (integration_type in ('billit', 'other', 'netlify', 'grenke', 'tulip'));

-- ---------------------------------------------------------------------------
-- 3. RPC — get_tulip_credentials (read API key from Vault)
--    Called by the tulip-api edge function with service_role.
--    Also callable by company admins (used by UI "Test connection").
-- ---------------------------------------------------------------------------
create or replace function public.get_tulip_credentials(
  p_company_id uuid,
  p_environment text
)
returns table (api_key text)
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_settings        jsonb;
  v_key_secret_name text;
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

  if p_environment not in ('sandbox', 'production') then
    raise exception 'invalid environment: %', p_environment using errcode = '22023';
  end if;

  select settings into v_settings
  from public.company_integrations
  where company_id = p_company_id
    and integration_type = 'tulip';

  v_key_secret_name := v_settings #>> array['environments', p_environment, 'api_key_secret_name'];

  if v_key_secret_name is null then
    return; -- empty result set: caller treats this as "credentials not configured"
  end if;

  return query
  select
    (select decrypted_secret
       from vault.decrypted_secrets
      where name = v_key_secret_name
      limit 1) as api_key;
end;
$$;

revoke all on function public.get_tulip_credentials(uuid, text) from public;
grant execute on function public.get_tulip_credentials(uuid, text) to authenticated;
grant execute on function public.get_tulip_credentials(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. RPC — set_tulip_credentials (upsert API key into Vault)
--    Used by Settings UI when an admin pastes the Tulip API key.
-- ---------------------------------------------------------------------------
create or replace function public.set_tulip_credentials(
  p_company_id  uuid,
  p_environment text,
  p_api_key     text
)
returns jsonb
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_key_secret_name text;
  v_key_id          uuid;
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

  if p_environment not in ('sandbox', 'production') then
    raise exception 'invalid environment: %', p_environment using errcode = '22023';
  end if;

  if coalesce(trim(p_api_key), '') = '' then
    raise exception 'api_key is empty' using errcode = '22023';
  end if;

  v_key_secret_name := 'tulip_' || p_environment || '_apikey_' || replace(p_company_id::text, '-', '');

  -- Upsert API key into Vault
  select id into v_key_id from vault.secrets where name = v_key_secret_name;
  if v_key_id is null then
    perform vault.create_secret(p_api_key, v_key_secret_name,
      'Tulip insurance API key (' || p_environment || ') for company ' || p_company_id::text);
  else
    perform vault.update_secret(v_key_id, p_api_key);
  end if;

  -- Update or insert into company_integrations (non-secret config only)
  insert into public.company_integrations (
    company_id, integration_type, is_enabled, settings
  ) values (
    p_company_id, 'tulip', true,
    jsonb_build_object(
      'environments', jsonb_build_object(
        p_environment, jsonb_build_object(
          'api_key_secret_name', v_key_secret_name,
          'configured_at',       now()
        )
      )
    )
  )
  on conflict (company_id, integration_type) do update
  set settings = jsonb_set(
        coalesce(public.company_integrations.settings, '{}'::jsonb),
        array['environments', p_environment],
        jsonb_build_object(
          'api_key_secret_name', v_key_secret_name,
          'configured_at',       now()
        ),
        true
      ),
      is_enabled = true,
      updated_at = now();

  return jsonb_build_object(
    'success', true,
    'environment', p_environment,
    'api_key_secret_name', v_key_secret_name
  );
end;
$$;

revoke all on function public.set_tulip_credentials(uuid, text, text) from public;
grant execute on function public.set_tulip_credentials(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. RPC — get_tulip_integration_status (UI helper, no secrets exposed)
-- ---------------------------------------------------------------------------
create or replace function public.get_tulip_integration_status(p_company_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_sandbox_configured boolean := false;
  v_prod_configured    boolean := false;
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
   where company_id = p_company_id and integration_type = 'tulip';

  if not found then
    return jsonb_build_object(
      'configured', false,
      'is_enabled', false,
      'environments', jsonb_build_object('sandbox', false, 'production', false)
    );
  end if;

  v_sandbox_configured := (v_row.settings #>> array['environments','sandbox','api_key_secret_name']) is not null;
  v_prod_configured    := (v_row.settings #>> array['environments','production','api_key_secret_name']) is not null;

  return jsonb_build_object(
    'configured', v_sandbox_configured or v_prod_configured,
    'is_enabled', v_row.is_enabled,
    'updated_at', v_row.updated_at,
    'environments', jsonb_build_object(
      'sandbox', v_sandbox_configured,
      'production', v_prod_configured
    ),
    'sandbox_configured_at', v_row.settings #>> array['environments','sandbox','configured_at'],
    'prod_configured_at',    v_row.settings #>> array['environments','production','configured_at']
  );
end;
$$;

revoke all on function public.get_tulip_integration_status(uuid) from public;
grant execute on function public.get_tulip_integration_status(uuid) to authenticated;
