

# Plan de correction : Affichage du statut Mollie existant

## Problème

Le mandat SEPA est créé avec succès chez Mollie et la base de données est correctement mise à jour (confirmé : `mollie_mandate_id: mdt_MzmirpaJkR`, `mollie_mandate_status: valid`). Cependant, l'interface ne se rafraîchit pas et ne montre pas l'état du mandat existant après création ou rechargement de la page.

## Cause racine

Le composant `MollieSepaCard` ne reçoit pas les informations Mollie depuis les props du contrat car :
1. L'interface TypeScript `Contract` ne déclare pas les champs Mollie
2. Les props passées au composant n'incluent pas ces champs
3. Le composant ne vérifie pas si un mandat existe déjà au chargement

## Modifications à effectuer

### 1. Interface `Contract` dans `src/services/contractService.ts`

Ajouter les champs Mollie à l'interface :

```typescript
export interface Contract {
  // ... champs existants ...
  mollie_customer_id?: string;
  mollie_mandate_id?: string;
  mollie_mandate_status?: string;
  mollie_subscription_id?: string;
}
```

### 2. Props du composant `MollieSepaCard`

Modifier l'interface pour accepter les données Mollie existantes :

```typescript
interface MollieSepaCardProps {
  contract: {
    id: string;
    client_name: string;
    client_email?: string | null;
    monthly_payment: number | null;
    contract_duration?: number | null;
    lease_duration?: number | null;
    // Nouveaux champs Mollie
    mollie_customer_id?: string | null;
    mollie_mandate_id?: string | null;
    mollie_mandate_status?: string | null;
  };
  companyId: string;
  onSuccess?: (customerId: string) => void;
}
```

### 3. Page `ContractDetail.tsx`

Passer les champs Mollie au composant :

```typescript
<MollieSepaCard 
  contract={{
    id: contract.id,
    client_name: contract.client_name,
    client_email: contract.client_email,
    monthly_payment: contract.monthly_payment,
    contract_duration: contract.contract_duration,
    lease_duration: contract.lease_duration,
    // Ajouter les champs Mollie
    mollie_customer_id: contract.mollie_customer_id,
    mollie_mandate_id: contract.mollie_mandate_id,
    mollie_mandate_status: contract.mollie_mandate_status,
  }}
  companyId={companyId}
  onSuccess={() => refetch()}
/>
```

### 4. Composant `MollieSepaCard.tsx`

Modifier le composant pour :
- Détecter si un mandat existe déjà au chargement
- Afficher l'état existant au lieu du formulaire de création
- Permettre de créer un abonnement si le mandat est valide

```typescript
// Ajouter au début du composant
const hasExistingMandate = contract.mollie_mandate_id && contract.mollie_mandate_status;

// Initialiser l'état avec les données existantes
useEffect(() => {
  if (hasExistingMandate) {
    setMandateInfo({
      id: contract.mollie_mandate_id!,
      status: contract.mollie_mandate_status!
    });
    setSuccess(true);
  }
}, [contract.mollie_mandate_id, contract.mollie_mandate_status]);
```

## Résultat attendu

Après ces modifications :
1. Le composant affichera immédiatement le mandat existant si `mollie_mandate_id` est présent
2. Après création d'un nouveau mandat, le callback `refetch()` rechargera les données
3. Au rechargement de la page, l'état du mandat sera correctement affiché

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/services/contractService.ts` | Ajouter champs Mollie à l'interface `Contract` |
| `src/pages/ContractDetail.tsx` | Passer les champs Mollie au composant |
| `src/components/contracts/MollieSepaCard.tsx` | Gérer l'affichage du mandat existant |

