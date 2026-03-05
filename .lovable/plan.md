

# Modifier l'IBAN d'un mandat SEPA existant

## Contexte

Quand un client change de banque, il faut pouvoir mettre a jour l'IBAN du mandat SEPA. L'API Mollie ne permet pas de modifier un mandat existant — il faut revoquer l'ancien et en creer un nouveau avec le nouvel IBAN, puis reconfigurer l'abonnement sur le nouveau mandat.

## Solution

### 1. Edge Function — nouvelle action `update_mandate_iban`

**Fichier : `supabase/functions/mollie-sepa/index.ts`**

Ajouter une action `update_mandate_iban` qui :
1. Revoque l'ancien mandat (DELETE `/customers/{id}/mandates/{id}`)
2. Cree un nouveau mandat direct avec le nouvel IBAN
3. Annule l'abonnement actif (si existant)
4. Recree l'abonnement avec les memes parametres (montant, interval, times, description) lie au nouveau mandat
5. Met a jour le contrat en DB (`mollie_mandate_id`, `mollie_mandate_status`, `mollie_subscription_id`)

### 2. Utilitaire client

**Fichier : `src/utils/mollie.ts`**

Ajouter une fonction `updateMollieMandateIban` qui appelle l'edge function avec l'action `update_mandate_iban`.

### 3. UI — bouton et dialog dans MollieSepaCard

**Fichier : `src/components/contracts/MollieSepaCard.tsx`**

Dans la section ou le mandat est affiche (apres configuration), ajouter un bouton crayon a cote du mandat. Au clic, ouvrir un dialog contenant :
- Le composant `IBANInput` existant (avec validation)
- Un champ BIC optionnel
- Un champ nom du titulaire (pre-rempli avec le nom client)
- Un recapitulatif de l'impact (l'abonnement sera recree)
- Bouton de confirmation

### Fichiers modifies

1. **`supabase/functions/mollie-sepa/index.ts`** — action `update_mandate_iban`
2. **`src/utils/mollie.ts`** — fonction `updateMollieMandateIban`
3. **`src/components/contracts/MollieSepaCard.tsx`** — dialog de modification IBAN

