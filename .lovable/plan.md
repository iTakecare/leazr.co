

# Fix: Détection des paiements rétrofacturés Mollie

## Problème racine

Dans l'API Mollie, un paiement rétrofacturé **conserve son statut "paid"**. L'information de rétrofacturation est stockée dans un champ séparé `amountChargedBack` sur l'objet paiement. Notre code ne regarde que `payment.status`, qui reste "paid" → badge vert "Payé" même si l'argent a été repris.

## Solution

### 1. Mettre à jour l'interface `MolliePayment` (src/utils/mollie.ts)

Ajouter le champ optionnel `amountChargedBack` à l'interface :

```typescript
export interface MolliePayment {
  id: string;
  status: "open" | "pending" | "paid" | "failed" | "expired" | "canceled";
  amount: { value: string; currency: string };
  amountChargedBack?: { value: string; currency: string }; // NEW
  createdAt: string;
  paidAt?: string;
  description: string;
  subscriptionId?: string;
}
```

### 2. Modifier la logique d'affichage du badge (src/components/contracts/MollieSepaCard.tsx)

Modifier `getPaymentStatusBadge` pour accepter le paiement complet (pas juste le status string) et vérifier `amountChargedBack` :

- Si `payment.amountChargedBack` existe et a une valeur > 0 → afficher badge rouge "Rétrofacturé" (même si status = "paid")
- Sinon, utiliser le switch existant sur `payment.status`

### 3. Modifier le bouton "Relancer" et "Facturer"

- Permettre "Relancer" si le paiement a `amountChargedBack` (en plus de failed/expired/canceled)
- Masquer "Facturer" si le paiement a `amountChargedBack`

### Fichiers modifiés

1. **`src/utils/mollie.ts`** : ajouter `amountChargedBack` à l'interface
2. **`src/components/contracts/MollieSepaCard.tsx`** : modifier `getPaymentStatusBadge` et la logique des boutons pour détecter les chargebacks via `amountChargedBack`

