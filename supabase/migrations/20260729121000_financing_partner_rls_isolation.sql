-- WINLEASE PHASE 1 (sécurité) : un utilisateur PARTENAIRE de financement a
-- profiles.company_id = société du financeur → il satisferait les branches
-- `company_id = get_user_company_id()` des policies société et verrait TOUTES
-- les données du financeur (même classe de faille que le leak client du 17/06).
-- Correctif préventif : policies RESTRICTIVE `zzz_block_financing_partners`
-- (AND-ées avec les policies existantes → ne changent RIEN pour staff/admin) :
-- - tables cœur : accès limité à SES propres lignes (financing_partner_id) ;
-- - tables internes : blocage total (même liste que zzz_block_clients).

-- Helper : l'utilisateur est-il un partenaire de financement (quel que soit son statut) ?
create or replace function public.is_financing_partner_user()
returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from public.financing_partners where user_id = auth.uid())
$$;

-- Tables cœur : le partenaire ne voit que SES lignes
drop policy if exists zzz_block_financing_partners on public.offers;
create policy zzz_block_financing_partners on public.offers as restrictive for all to authenticated
  using (not public.is_financing_partner_user() or financing_partner_id = public.get_financing_partner_id());

drop policy if exists zzz_block_financing_partners on public.clients;
create policy zzz_block_financing_partners on public.clients as restrictive for all to authenticated
  using (not public.is_financing_partner_user() or financing_partner_id = public.get_financing_partner_id());

drop policy if exists zzz_block_financing_partners on public.offer_equipment;
create policy zzz_block_financing_partners on public.offer_equipment as restrictive for all to authenticated
  using (not public.is_financing_partner_user() or offer_id in (
    select o.id from public.offers o where o.financing_partner_id = public.get_financing_partner_id()
  ));

drop policy if exists zzz_block_financing_partners on public.offer_documents;
create policy zzz_block_financing_partners on public.offer_documents as restrictive for all to authenticated
  using (not public.is_financing_partner_user() or offer_id in (
    select o.id from public.offers o where o.financing_partner_id = public.get_financing_partner_id()
  ));

-- Contrats : accessibles plus tard (phase livraison) uniquement via SES demandes
drop policy if exists zzz_block_financing_partners on public.contracts;
create policy zzz_block_financing_partners on public.contracts as restrictive for all to authenticated
  using (not public.is_financing_partner_user() or offer_id in (
    select o.id from public.offers o where o.financing_partner_id = public.get_financing_partner_id()
  ));

drop policy if exists zzz_block_financing_partners on public.contract_equipment;
create policy zzz_block_financing_partners on public.contract_equipment as restrictive for all to authenticated
  using (not public.is_financing_partner_user() or contract_id in (
    select c.id from public.contracts c
    join public.offers o on c.offer_id = o.id
    where o.financing_partner_id = public.get_financing_partner_id()
  ));

-- Profils : uniquement le sien
drop policy if exists zzz_block_financing_partners on public.profiles;
create policy zzz_block_financing_partners on public.profiles as restrictive for all to authenticated
  using (not public.is_financing_partner_user() or id = auth.uid());

-- Tables internes : blocage total pour les partenaires (même liste que zzz_block_clients
-- + invoices, collaborators, ambassadors)
do $$
declare t text;
declare tables text[] := array[
  'api_keys','smtp_settings','imap_accounts','imap_folders','custom_auth_tokens',
  'company_integrations','woocommerce_configs','messaging_settings','synced_emails',
  'voice_calls','voice_presence','chat_agent_status','offer_call_logs','offer_automation_log',
  'commission_rates','commission_levels','partner_commissions','supplier_invoices',
  'supplier_invoice_matches','cost_centers','suppliers','grenke_submissions',
  'grenke_reference_data','grenke_automation_settings','grenke_field_mappings',
  'contract_workflow_logs','client_kyc_reports','client_custom_prices',
  'client_custom_variant_prices','client_custom_variants','client_custom_variant_combinations',
  'message_ai_suggestions','offer_info_requests','offer_reminders','equipment_alerts',
  'equipment_maintenance','equipment_tracking','equipment_assignments_history',
  'ambassador_clients','ambassador_custom_prices','ambassador_activity_logs',
  'company_enrichment_cache','cloudflare_subdomain_logs',
  'chat_conversations','chat_messages','document_requests','credit_notes',
  'invoices','collaborators','ambassadors'
];
begin
  foreach t in array tables loop
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=t) then
      execute format('drop policy if exists zzz_block_financing_partners on public.%I', t);
      execute format('create policy zzz_block_financing_partners on public.%I as restrictive for all to authenticated using (not public.is_financing_partner_user())', t);
    end if;
  end loop;
end $$;
