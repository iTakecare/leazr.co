-- Rapatriement du détail financier réel depuis Grenke (GET /requests/{id}).
-- Grenke peut ajuster manuellement les montants par bien après soumission
-- (« ajustement spécial du représentant »). On stocke donc le détail réel renvoyé
-- par Grenke pour facturer EXACTEMENT ces valeurs (concordance demande↔Grenke↔facture).
-- NB: appliqué en prod via Management API (historique de migration désync) — ce
-- fichier sert de trace.
alter table public.offers
  add column if not exists grenke_financing_objects jsonb,
  add column if not exists grenke_financing_amount numeric,
  add column if not exists grenke_dossier_snapshot jsonb,
  add column if not exists grenke_dossier_fetched_at timestamptz;

comment on column public.offers.grenke_financing_objects is 'Détail par bien (FinancingObjects) rapatrié de Grenke GET /requests/{id} — montants ajustés inclus, source de vérité pour la facture bailleur';
comment on column public.offers.grenke_financing_amount is 'Montant financé réel chez Grenke (FinancingAmount du dossier) — peut différer de financed_amount après ajustement représentant';
