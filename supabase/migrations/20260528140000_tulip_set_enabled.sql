-- Tulip — RPC pour activer/désactiver l'intégration sans clé API.
-- Permet d'afficher la carte "Assurance Tulip" (état "Bientôt") uniquement
-- aux sociétés qui ont opté pour Tulip, avant même la saisie de la clé.
-- Safe to re-run (create or replace).

create or replace function public.set_tulip_enabled(
  p_company_id uuid,
  p_enabled    boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Seuls les admins de la société cible peuvent activer/désactiver.
  if not exists (
       select 1 from public.profiles
       where id = auth.uid()
         and company_id = p_company_id
     )
     and not public.is_admin_optimized()
  then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  insert into public.company_integrations (company_id, integration_type, is_enabled, settings)
  values (p_company_id, 'tulip', p_enabled, '{}'::jsonb)
  on conflict (company_id, integration_type) do update
    set is_enabled = excluded.is_enabled,
        updated_at = now();
end;
$$;

revoke all on function public.set_tulip_enabled(uuid, boolean) from public;
grant execute on function public.set_tulip_enabled(uuid, boolean) to authenticated;
