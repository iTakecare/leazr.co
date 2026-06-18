-- Champ "Email administration & comptabilité" du bailleur : destinataire des
-- demandes de factures envoyées par le client depuis l'espace client.
alter table public.leasers add column if not exists accounting_email text;
comment on column public.leasers.accounting_email is 'Adresse email administration/comptabilité du bailleur (demandes de factures)';
