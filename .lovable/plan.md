

# Historique des modifications SEPA par contrat

## Objectif

Tracer toutes les modifications faites sur les parametres SEPA d'un contrat (montant, jour de prelevement, date de prelevement, IBAN) dans une table dediee, et afficher cet historique dans la MollieSepaCard.

## 1. Nouvelle table `mollie_sepa_changes`

Migration SQL :

```sql
CREATE TABLE public.mollie_sepa_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id),
  change_type TEXT NOT NULL, -- 'amount', 'payment_day', 'next_date', 'iban'
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_mollie_sepa_changes_contract ON public.mollie_sepa_changes(contract_id);
ALTER TABLE public.mollie_sepa_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view sepa changes"
ON public.mollie_sepa_changes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = mollie_sepa_changes.company_id)
);

CREATE POLICY "Company members can insert sepa changes"
ON public.mollie_sepa_changes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = mollie_sepa_changes.company_id)
);
```

## 2. Logger les modifications dans `MollieSepaCard.tsx`

Apres chaque appel reussi dans les 4 handlers (`handleUpdatePaymentDay`, `handleUpdateAmount`, `handleUpdateNextDate`, `handleUpdateIban`), inserer un enregistrement dans `mollie_sepa_changes` avec :
- `change_type` : le type de modification
- `old_value` / `new_value` : les anciennes et nouvelles valeurs
- `changed_by` : l'utilisateur connecte (via `auth.uid()`)
- `company_id` : depuis les props

## 3. Afficher l'historique dans `MollieSepaCard.tsx`

Ajouter une section "Historique des modifications" en bas de la carte (apres la section paiements), avec :
- Query des `mollie_sepa_changes` filtrees par `contract_id`, triees par date decroissante
- Affichage en timeline compacte : date, type de changement (badge), ancienne valeur → nouvelle valeur
- Icones selon le type (Euro pour montant, Calendar pour date/jour, Landmark pour IBAN)

## Fichiers modifies

1. **Migration SQL** — table `mollie_sepa_changes` + RLS
2. **`src/components/contracts/MollieSepaCard.tsx`** — insert apres chaque update + section historique

