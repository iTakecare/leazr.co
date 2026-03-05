

# Ajouter une option "Facturation avec TVA" au formulaire SEPA et permettre la modification du montant

## Probleme

1. Le montant du prelevement SEPA est saisi manuellement lors de la configuration initiale, mais il n'y a pas d'option pour inclure automatiquement la TVA (21% pour la Belgique). L'utilisateur doit calculer le montant TVAC manuellement, ce qui mene a des erreurs (oubli de la TVA).

2. Une fois le prelevement configure, il n'y a pas de moyen de modifier le montant de l'abonnement depuis l'interface.

## Solution

### 1. Ajouter une checkbox "Facturation avec TVA" dans le formulaire de configuration SEPA

**Fichier : `src/components/contracts/MollieSepaCard.tsx`**

- Ajouter un state `includeVat` (boolean, defaut `false`)
- Ajouter une checkbox sous le champ "Montant mensuel" : "Appliquer la TVA (21%)"
- Quand cochee, le montant envoye a Mollie = `montant * 1.21` (arrondi a 2 decimales)
- Le recapitulatif affiche clairement : montant HTVA, TVA, montant TVAC
- Le `montant` saisi dans le formulaire reste le montant HTVA, la TVA est calculee automatiquement
- Detection automatique : si l'IBAN commence par "BE", proposer/pre-cocher la TVA

### 2. Ajouter un bouton "Modifier le montant" dans la vue configuree

**Fichier : `src/components/contracts/MollieSepaCard.tsx`**

- A cote du montant affiche dans la section abonnement, ajouter un bouton crayon (comme pour le jour de prelevement)
- Ouvrir un dialog avec :
  - Le montant actuel pre-rempli
  - La checkbox TVA
  - Un recapitulatif du nouveau montant
- Appeler `updateMollieSubscription` avec le nouveau montant (il faudra verifier que l'edge function supporte la mise a jour du montant)

### 3. Verifier/adapter `updateMollieSubscription`

**Fichier : `src/utils/mollie.ts`**

- Verifier que la fonction `updateMollieSubscription` accepte un parametre `amount` en plus de `new_start_date`
- Si non, ajouter le parametre optionnel `new_amount` et le passer a l'edge function

### Fichiers modifies

1. **`src/components/contracts/MollieSepaCard.tsx`** : checkbox TVA dans le formulaire + dialog modification montant
2. **`src/utils/mollie.ts`** : ajouter `new_amount` a `updateMollieSubscription` si necessaire

