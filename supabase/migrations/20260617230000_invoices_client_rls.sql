-- P0 SÉCURITÉ : les policies "société" sur invoices laissaient un CLIENT (dont le
-- company_id matche le tenant) voir TOUTES les factures de la société = fuite entre
-- clients. On restreint l'accès société aux utilisateurs NON-clients et on ajoute une
-- policy SELECT "ses propres factures" pour les clients (via leurs contrats).
-- Appliqué en prod via execute_sql (historique migrations désync).

alter policy invoices_company_access on public.invoices
  using (((company_id = get_user_company_id()) OR is_admin_optimized())
         AND NOT EXISTS (select 1 from public.clients cl where cl.user_id = auth.uid()));

alter policy invoices_company_isolation_secure on public.invoices
  using (((company_id = get_user_company_id()) OR is_admin_optimized())
         AND NOT EXISTS (select 1 from public.clients cl where cl.user_id = auth.uid()));

drop policy if exists invoices_client_own_select on public.invoices;
create policy invoices_client_own_select on public.invoices
  for select to authenticated
  using (exists (
    select 1 from public.contracts c
    join public.clients cl on cl.id = c.client_id
    where c.id = invoices.contract_id and cl.user_id = auth.uid()
  ));
