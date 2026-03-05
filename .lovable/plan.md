

# Ajouter les frais d'insuffisance de fonds sur la facture mensuelle

## Contexte

Quand un paiement est relancé avec des frais d'insuffisance de fonds, deux prélèvements Mollie séparés sont créés (loyer + frais). Mais quand on clique "Facturer" sur le paiement de loyer, la facture générée ne contient que le loyer sans les frais. L'utilisateur veut que les frais apparaissent comme une ligne supplémentaire sur la même facture.

## Solution

### 1. Détecter les frais associés lors de la facturation

**Fichier : `src/components/contracts/MollieSepaCard.tsx`**

Quand on clique "Facturer" sur un paiement de loyer, chercher dans `recentPayments` s'il existe un paiement avec la description contenant "Frais pour insuffisance de fonds" créé à une date proche (même jour ou jour suivant). Si trouvé, passer ce montant de frais à la fonction de génération de facture.

### 2. Modifier `generateSelfLeasingMonthlyInvoice`

**Fichier : `src/services/invoiceService.ts`**

Ajouter un paramètre optionnel `insufficientFundsFee?: number` à la fonction. Si présent :
- Ajouter une ligne supplémentaire dans `equipment_data` avec le titre "Frais pour insuffisance de fonds" et le montant des frais
- Ajouter le montant des frais au total HTVA de la facture
- Recalculer TVA et total TTC en incluant les frais

### 3. Modifier l'appel dans MollieSepaCard

**Fichier : `src/components/contracts/MollieSepaCard.tsx`**

Dans `handleGenerateMonthlyInvoice`, avant d'appeler `generateSelfLeasingMonthlyInvoice`, rechercher un paiement de frais associé dans la liste des paiements récents et passer le montant en paramètre.

### Fichiers modifiés

1. **`src/services/invoiceService.ts`** : paramètre optionnel `insufficientFundsFee` + ligne de frais sur la facture
2. **`src/components/contracts/MollieSepaCard.tsx`** : détection du paiement de frais associé et passage à la fonction de génération

