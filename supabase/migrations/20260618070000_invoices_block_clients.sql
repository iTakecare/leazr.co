-- CORRECTION : la table `invoices` = factures qu'iTakecare envoie AU BAILLEUR
-- (Grenke/Atlance…) pour être payé du contrat = données INTERNES. Le client ne doit
-- RIEN en voir (contrairement à ce que supposait 20260617230000 qui scopait au client).
-- On supprime la policy client-own et on BLOQUE invoices pour les clients (restrictive).
drop policy if exists invoices_client_own_select on public.invoices;
drop policy if exists zzz_block_clients on public.invoices;
create policy zzz_block_clients on public.invoices as restrictive for all to authenticated
  using (not public.is_client_user());
