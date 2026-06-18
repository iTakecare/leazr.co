-- P0 SÉCURITÉ MAJEUR : la RLS de tables centrales avait une branche
-- `company_id = get_user_company_id()` qu'un utilisateur CLIENT (membre du tenant)
-- satisfaisait → il voyait TOUTES les données de la société (tous les autres clients,
-- contrats, offres, équipements, collaborateurs). Fuite RGPD entre clients.
-- Correctif : gating de la branche société par `NOT is_client_user()` (réservée
-- staff/admin) ; les branches client-spécifiques (client_id / user_id) restent.
-- Helper SECURITY DEFINER pour éviter la récursion RLS sur la table clients.
-- Appliqué en prod via execute_sql (historique migrations désync).

create or replace function public.is_client_user()
returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from public.clients where user_id = auth.uid())
$$;

alter policy clients_secure_company_isolation on public.clients
  using (((company_id = get_user_company_id()) AND NOT public.is_client_user()) OR is_admin_optimized() OR (user_id = auth.uid()))
  with check (((company_id = get_user_company_id()) AND NOT public.is_client_user()) OR is_admin_optimized() OR (user_id = auth.uid()));

alter policy "Contracts strict company isolation" on public.contracts
  using ((get_user_company_id() IS NOT NULL) AND (((company_id = get_user_company_id()) AND NOT public.is_client_user()) OR is_admin_optimized() OR (client_id IN (SELECT clients.id FROM clients WHERE clients.user_id = auth.uid()))))
  with check ((get_user_company_id() IS NOT NULL) AND (((company_id = get_user_company_id()) AND NOT public.is_client_user()) OR is_admin_optimized()));

alter policy offers_client_access on public.offers
  using (is_admin_optimized() OR ((company_id = get_user_company_id()) AND NOT public.is_client_user()) OR ((auth.uid() IS NOT NULL) AND (client_id IN (SELECT c.id FROM clients c WHERE c.user_id = auth.uid()))));

alter policy contract_equipment_company_access on public.contract_equipment
  using (((contract_id IN (SELECT contracts.id FROM contracts WHERE contracts.company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()))) AND NOT public.is_client_user()) OR (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['admin','super_admin']))));

drop policy if exists contract_equipment_client_manage on public.contract_equipment;
create policy contract_equipment_client_manage on public.contract_equipment for all to authenticated
  using (contract_id IN (SELECT c.id FROM contracts c JOIN clients cl ON c.client_id = cl.id WHERE cl.user_id = auth.uid()))
  with check (contract_id IN (SELECT c.id FROM contracts c JOIN clients cl ON c.client_id = cl.id WHERE cl.user_id = auth.uid()));

alter policy collaborators_secure_company_access on public.collaborators
  using ((client_id IN (SELECT c.id FROM clients c WHERE ((c.company_id = get_user_company_id()) AND NOT public.is_client_user()) OR (c.user_id = auth.uid()))) OR is_admin_optimized())
  with check ((client_id IN (SELECT c.id FROM clients c WHERE ((c.company_id = get_user_company_id()) AND NOT public.is_client_user()) OR (c.user_id = auth.uid()))) OR is_admin_optimized());

alter policy offer_equipment_secure_access on public.offer_equipment
  using (((offer_id IN (SELECT offers.id FROM offers WHERE offers.company_id = get_user_company_id())) AND NOT public.is_client_user()) OR (offer_id IN (SELECT offers.id FROM offers WHERE offers.client_id IN (SELECT clients.id FROM clients WHERE clients.user_id = auth.uid()))) OR is_admin_optimized());
