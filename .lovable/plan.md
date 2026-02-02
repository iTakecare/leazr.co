

# Plan : Afficher les informations de prélèvement Mollie en temps réel

## Contexte

Sur la capture d'écran Mollie, on voit deux prélèvements "En cours" pour les contrats iTakecare :
- LOC-ITC-2026-01003 (Patrick Grasseels) : 131,85 €
- LOC-ITC-2026-01001 (Frederic Veillard) : 67,69 €

Ces informations ne sont pas encore affichées dans Leazr. L'objectif est de récupérer et afficher :
- La date du prochain prélèvement prévu
- Le statut du dernier paiement (en cours, payé, expiré)
- L'historique des paiements récents

## Données disponibles via l'API Mollie

### 1. Abonnement (`/customers/{id}/subscriptions/{id}`)

| Champ | Description |
|-------|-------------|
| `nextPaymentDate` | Date du prochain prélèvement |
| `status` | active, pending, canceled, suspended, completed |
| `timesRemaining` | Nombre de prélèvements restants |
| `startDate` | Date de début |

### 2. Paiements (`/customers/{id}/payments`)

| Champ | Description |
|-------|-------------|
| `id` | ID du paiement |
| `status` | open, pending, paid, failed, expired, canceled |
| `amount` | Montant |
| `createdAt` | Date de création |
| `paidAt` | Date de paiement (si payé) |
| `description` | Description |

## Modifications à effectuer

### 1. Edge Function : Ajouter deux actions

Fichier : `supabase/functions/mollie-sepa/index.ts`

**Action `get_subscription`** : Récupérer les détails d'un abonnement

```typescript
case "get_subscription": {
  if (!body.customer_id || !body.subscription_id) {
    return error("customer_id et subscription_id requis");
  }
  result = await mollieRequest(
    `/customers/${body.customer_id}/subscriptions/${body.subscription_id}`
  );
  break;
}
```

**Action `list_payments`** : Récupérer l'historique des paiements

```typescript
case "list_payments": {
  if (!body.customer_id) {
    return error("customer_id requis");
  }
  result = await mollieRequest(
    `/customers/${body.customer_id}/payments?limit=${body.limit || 10}`
  );
  break;
}
```

### 2. Utilitaires client

Fichier : `src/utils/mollie.ts`

Ajouter deux fonctions :

```typescript
// Récupérer les détails d'un abonnement
export async function getMollieSubscription(
  customerId: string, 
  subscriptionId: string
): Promise<MollieSubscriptionDetails>

// Récupérer l'historique des paiements
export async function getMolliePayments(
  customerId: string, 
  limit?: number
): Promise<MolliePaymentHistory>
```

### 3. Interface MollieSepaCard

Fichier : `src/components/contracts/MollieSepaCard.tsx`

**Nouvelles données à afficher :**

```
┌────────────────────────────────────────────────┐
│ ✓ Prélèvement SEPA configuré                   │
├────────────────────────────────────────────────┤
│ Mandat     mdt_hzFK9BtURr         [Valide]     │
│ Abonnement sub_Hiswu8fBBH         [Actif]      │
│ Jour       1er du mois            [✏️]         │
├────────────────────────────────────────────────┤
│ Prochain prélèvement                           │
│ 📅 1 mars 2026 • 67,69 €                       │
│ Prélèvements restants : 35                     │
├────────────────────────────────────────────────┤
│ Historique récent                              │
│ ────────────────────────────────────────────── │
│ 🔄 1 fév 2026   67,69 €   En cours             │
│ ✓  1 jan 2026   67,69 €   Payé                 │
└────────────────────────────────────────────────┘
```

**Modifications du composant :**

1. Ajouter un état pour stocker les infos de l'abonnement et paiements :
   ```typescript
   const [subscriptionDetails, setSubscriptionDetails] = useState(null);
   const [recentPayments, setRecentPayments] = useState([]);
   const [loadingDetails, setLoadingDetails] = useState(false);
   ```

2. Ajouter un useEffect pour charger les données au montage :
   ```typescript
   useEffect(() => {
     if (contract.mollie_customer_id && contract.mollie_subscription_id) {
       fetchMollieDetails();
     }
   }, [contract.mollie_customer_id, contract.mollie_subscription_id]);
   ```

3. Ajouter une section "Prochain prélèvement" avec :
   - Date du prochain prélèvement
   - Montant
   - Nombre de prélèvements restants

4. Ajouter une section "Historique récent" (3-5 derniers paiements) avec :
   - Date
   - Montant
   - Statut (badge coloré)

5. Ajouter un bouton "Rafraîchir" pour recharger les données

### 4. Interfaces TypeScript

Ajouter les types pour les données Mollie :

```typescript
interface MollieSubscriptionDetails {
  nextPaymentDate: string | null;
  status: string;
  timesRemaining?: number;
  times?: number;
  startDate: string;
}

interface MolliePayment {
  id: string;
  status: "open" | "pending" | "paid" | "failed" | "expired" | "canceled";
  amount: { value: string; currency: string };
  createdAt: string;
  paidAt?: string;
  description: string;
}
```

## Résumé des fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/mollie-sepa/index.ts` | Ajouter actions `get_subscription` et `list_payments` |
| `src/utils/mollie.ts` | Ajouter fonctions `getMollieSubscription` et `getMolliePayments` |
| `src/components/contracts/MollieSepaCard.tsx` | Afficher prochain prélèvement + historique |

## Résultat attendu

1. Au chargement de la page contrat, les informations sont récupérées depuis Mollie
2. La date du prochain prélèvement est affichée clairement
3. L'historique des 3-5 derniers paiements est visible avec leur statut
4. Un bouton permet de rafraîchir les données à la demande
5. Les prélèvements "En cours" visibles dans Mollie apparaissent dans Leazr

