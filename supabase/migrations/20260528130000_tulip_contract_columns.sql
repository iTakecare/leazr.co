-- Tulip insurance — per-contract tracking columns.
-- Stores the Tulip contract id (cid) returned on subscription so we can later
-- fetch status / cancel, plus which environment the contract was created in.
-- Safe to re-run: every column is added with IF NOT EXISTS.

alter table public.contracts
  add column if not exists tulip_contract_id text,
  add column if not exists tulip_status text,
  add column if not exists tulip_environment text,
  add column if not exists tulip_subscribed_at timestamptz;

comment on column public.contracts.tulip_contract_id is
  'Identifiant du contrat côté Tulip (cid) renvoyé lors de la souscription assurance.';
comment on column public.contracts.tulip_environment is
  'Environnement Tulip utilisé pour la souscription: sandbox | production.';
