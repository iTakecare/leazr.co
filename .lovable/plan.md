

# Ajouter un date picker pour la date de premier prélèvement

## Contexte

Actuellement, la date de début de l'abonnement Mollie est calculée automatiquement : `paymentDay` du mois prochain. L'utilisateur veut pouvoir choisir une date libre, avec une suggestion automatique de commencer ce mois-ci si la livraison est avant le 15.

L'infrastructure est déjà prête : `MollieSepaCompleteData.start_date` existe et est passé à l'edge function, qui l'utilise si fourni. Il suffit d'ajouter l'UI.

## Modifications

### 1. Formulaire de setup initial (`MollieSepaCard.tsx`)

- Ajouter un state `customStartDate: Date | undefined`
- Ajouter un **date picker** (Popover + Calendar de shadcn) sous le champ "Nombre de mois" avec le label "Date du premier prélèvement"
- **Suggestion automatique** : au mount, si `contract.delivery_date` existe et est avant le 15 du mois, pré-remplir `customStartDate` au `paymentDay` du mois en cours. Sinon, laisser au `paymentDay` du mois prochain (comportement par défaut actuel)
- Passer `start_date: customStartDate?.toISOString().split('T')[0]` à `setupMollieSepaComplete`

### 2. Section abonnement actif — modifier la date de prochain prélèvement

- Ajouter un bouton crayon à côté de "Prochain prélèvement" (comme pour le montant et le jour)
- Ouvrir un dialog avec un date picker pour choisir la nouvelle date
- Appeler `updateMollieSubscription` avec `new_start_date` (déjà supporté par l'edge function)

### 3. Edge function (`mollie-sepa/index.ts`)

- Aucune modification nécessaire : `start_date` et `new_start_date` sont déjà gérés

### Fichiers modifiés

1. **`src/components/contracts/MollieSepaCard.tsx`** : date picker dans le formulaire de setup + dialog de modification de date sur abonnement actif

