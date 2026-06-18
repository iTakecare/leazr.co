-- FIX régressions du durcissement RLS :
-- 1) Catalogue personnalisé : client_custom_* avaient été BLOQUÉS à tort (ce sont les
--    prix/variantes perso du client, nécessaires au catalogue). On remplace le block par
--    une restrictive "client = ses propres lignes" (staff inchangé, client scopé).
-- 2) offers : la policy ne voyait que client_id → on ajoute user_id (offres créées par le
--    client, ex. demande en cours non encore liée au client_id).
-- 3) Perf : index manquants sur offers(client_id) et offers(user_id) — accélère RLS+requêtes.
-- (clients.user_id et contracts.client_id déjà indexés.) Appliqué via execute_sql.

do $$
declare t text;
begin
  foreach t in array array['client_custom_prices','client_custom_variant_prices','client_custom_variants','client_custom_variant_combinations'] loop
    execute format('drop policy if exists zzz_block_clients on public.%I', t);
    execute format('drop policy if exists zzz_client_own on public.%I', t);
    execute format('create policy zzz_client_own on public.%I as restrictive for all to authenticated using (not public.is_client_user() or client_id in (select c.id from clients c where c.user_id = auth.uid()))', t);
  end loop;
end $$;

alter policy offers_client_access on public.offers
  using (is_admin_optimized()
         OR ((company_id = get_user_company_id()) AND NOT public.is_client_user())
         OR (client_id IN (SELECT c.id FROM clients c WHERE c.user_id = auth.uid()))
         OR (user_id = auth.uid()));

create index if not exists idx_offers_client_id on public.offers(client_id);
create index if not exists idx_offers_user_id on public.offers(user_id);
