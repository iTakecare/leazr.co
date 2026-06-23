-- Paramètres de facturation par bailleur : mode de paiement + délai de paiement,
-- repris sur la facture poussée vers Billit (PaymentMethod + ExpiryDate).
-- NB: appliqué en prod via Management API (historique de migration désync) — trace.
alter table public.leasers
  add column if not exists invoice_payment_method text,
  add column if not exists invoice_due_days integer;

comment on column public.leasers.invoice_payment_method is 'Mode de paiement Billit pour les factures à ce bailleur (Wired/Domiciliation/Bancontact/Visa/Contant/Online/PrivateAccount/Other)';
comment on column public.leasers.invoice_due_days is 'Délai de paiement en jours -> date d''échéance = date facture + N jours (Billit ExpiryDate)';
