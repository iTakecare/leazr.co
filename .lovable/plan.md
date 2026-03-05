

# Fix: Gestion des retrofacturations Mollie et frais d'insuffisance

## Probleme

1. **Statut "chargedback" non gere** : Mollie a un statut `chargedback` (retrofacturation) qui n'existe pas dans le mapping de statuts du composant `MollieSepaCard`. Quand un paiement est retrofacture (code AM04 = insuffisance de fonds), il reste affiche comme "Paye" car le statut `chargedback` tombe dans le `default` du switch.

2. **Pas de frais d'insuffisance** : Quand on relance un prelevement, il n'y a aucune option pour facturer des frais supplementaires.

## Solution

### 1. Ajouter le statut "chargedback" dans MollieSepaCard

**Fichier : `src/components/contracts/MollieSepaCard.tsx`**

- Ajouter `chargedback` dans `getPaymentStatusBadge` avec un badge rouge "Retrofacture"
- Ajouter `chargedback` dans la condition du bouton "Relancer" (a cote de `failed`, `expired`, `canceled`)
- Empecher le bouton "Facturer" d'apparaitre pour les paiements `chargedback`

### 2. Ajouter un dialog de relance avec frais optionnels

**Fichier : `src/components/contracts/MollieSepaCard.tsx`**

- Quand on clique "Relancer" sur un paiement echoue/retrofacture, ouvrir un dialog qui propose :
  - Le montant du loyer a relancer (pre-rempli, non modifiable)
  - Une option "Ajouter des frais d'insuffisance de fonds" (checkbox)
  - Un champ montant configurable (par defaut 15 EUR)
  - Le prelevement des frais sera un paiement separe avec la description "Frais pour insuffisance de fonds"
- Les deux prelevements (loyer + frais) seront lances independamment via deux appels a `createMolliePayment`

### Fichiers modifies

1. **`src/components/contracts/MollieSepaCard.tsx`** : ajout statut `chargedback`, dialog de relance avec frais

Aucune modification de l'Edge Function necessaire - `createMolliePayment` (action `create_payment`) existe deja et supporte un montant et une description libres.

