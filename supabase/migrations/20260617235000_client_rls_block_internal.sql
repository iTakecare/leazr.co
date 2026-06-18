-- P0 SÉCURITÉ (audit complet) : un utilisateur CLIENT pouvait lire, via l'API, des
-- tables internes/secrètes de TOUTE la société : api_keys, smtp_settings, imap_accounts,
-- custom_auth_tokens, synced_emails (2931 emails), client_kyc_reports (579), supplier_invoices,
-- commissions, voice_calls, grenke_submissions, etc. (policies scopées société qu'un client
-- satisfaisait).
-- Correctif : policy RESTRICTIVE `zzz_block_clients` (AND-ée avec les policies existantes →
-- ne change RIEN pour staff/admin) qui refuse tout accès aux clients sur ces tables.
-- Le client n'a aucun besoin métier d'y accéder depuis l'espace client.
-- Appliqué en prod via execute_sql. is_client_user() = helper SECURITY DEFINER.

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
  'chat_conversations','chat_messages','document_requests','credit_notes'
];
begin
  foreach t in array tables loop
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=t) then
      execute format('drop policy if exists zzz_block_clients on public.%I', t);
      execute format('create policy zzz_block_clients on public.%I as restrictive for all to authenticated using (not public.is_client_user())', t);
    end if;
  end loop;
end $$;
