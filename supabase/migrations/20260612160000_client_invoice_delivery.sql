-- Canal d'envoi des factures par client : Peppol (pros enregistrés) ou Email.
-- Permet à Leazr de créer la facture dans Billit puis de l'envoyer via le bon
-- transport (Billit /v1/orders/commands/send Transporttype Peppol|Email).
-- Défaut intelligent au backfill : Peppol si n° TVA présent, sinon Email.
alter table clients
  add column if not exists invoice_delivery_method text check (invoice_delivery_method in ('peppol','email')),
  add column if not exists peppol_identifier text;

comment on column clients.invoice_delivery_method is 'Canal d''envoi des factures via Billit : peppol | email';
comment on column clients.peppol_identifier is 'Identifiant Peppol explicite (ex. 0208:0123456789). Optionnel : sinon déduit du n° TVA BE.';

-- Backfill (idempotent) : ne touche que les valeurs nulles.
update clients
   set invoice_delivery_method = case when coalesce(vat_number,'') <> '' then 'peppol' else 'email' end
 where invoice_delivery_method is null;
