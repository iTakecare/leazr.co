-- P0 SÉCURITÉ (suite) : fuites supplémentaires côté espace client.
-- - ambassadors : branche société visible par les clients → gating NOT is_client_user().
-- - offer_documents : (1) policy société gatée ; (2) policy token `offer_documents_token_select`
--   avait `OR auth.uid() IS NOT NULL` = TOUT utilisateur connecté lisait TOUS les documents
--   (KYC/ID/KBIS de tous les clients) → corrigé ; (3) les policies "token" (lien d'upload)
--   restreintes au rôle `anon` (accès anonyme par lien uniquement) ; (4) policy client own
--   pour préserver lecture+upload des docs de SES offres.
-- Appliqué en prod via execute_sql.

alter policy ambassadors_secure_company_access on public.ambassadors
  using (((company_id = get_user_company_id()) AND NOT public.is_client_user()) OR is_admin_optimized() OR (user_id = auth.uid()))
  with check (((company_id = get_user_company_id()) AND NOT public.is_client_user()) OR is_admin_optimized() OR (user_id = auth.uid()));

alter policy "Company users access own documents" on public.offer_documents
  using (((offer_id IN (SELECT offers.id FROM offers WHERE offers.company_id = get_user_company_id())) AND NOT public.is_client_user()) OR is_admin_optimized());

drop policy if exists offer_documents_client_manage on public.offer_documents;
create policy offer_documents_client_manage on public.offer_documents for all to authenticated
  using (offer_id IN (SELECT o.id FROM offers o JOIN clients cl ON o.client_id = cl.id WHERE cl.user_id = auth.uid()))
  with check (offer_id IN (SELECT o.id FROM offers o JOIN clients cl ON o.client_id = cl.id WHERE cl.user_id = auth.uid()));

drop policy if exists offer_documents_token_select on public.offer_documents;
create policy offer_documents_token_select on public.offer_documents for select to anon
  using (has_active_offer_upload_link(offer_id));

drop policy if exists offer_documents_secure_token_access on public.offer_documents;
create policy offer_documents_secure_token_access on public.offer_documents for select to anon
  using (EXISTS (SELECT 1 FROM offer_upload_links oul WHERE oul.offer_id = offer_documents.offer_id AND oul.expires_at > now() AND oul.used_at IS NULL));
