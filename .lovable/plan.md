
# Correction : Transmission de `mollie_subscription_id` au composant

## Probleme identifie

La base de donnees contient bien l'abonnement :

| Champ | Valeur |
|-------|--------|
| mollie_customer_id | cst_5q9WQgk3zB |
| mollie_mandate_id | mdt_hzFK9BtURr |
| mollie_mandate_status | valid |
| mollie_subscription_id | **sub_Hiswu8fBBH** |

Cependant, dans `ContractDetail.tsx` (lignes 175-179), le champ `mollie_subscription_id` n'est pas passe au composant `MollieSepaCard` :

```typescript
<MollieSepaCard 
  contract={{
    id: contract.id,
    client_name: contract.client_name,
    ...
    mollie_customer_id: contract.mollie_customer_id,
    mollie_mandate_id: contract.mollie_mandate_id,
    mollie_mandate_status: contract.mollie_mandate_status,
    // MANQUE: mollie_subscription_id
  }}
/>
```

## Solution

Ajouter la ligne manquante pour transmettre `mollie_subscription_id` :

```typescript
mollie_subscription_id: contract.mollie_subscription_id,
```

## Fichier a modifier

| Fichier | Modification |
|---------|-------------|
| `src/pages/ContractDetail.tsx` | Ajouter `mollie_subscription_id` aux props du composant |

## Resultat attendu

Apres cette correction, le composant recevra l'ID de l'abonnement et affichera correctement :
- L'abonnement actif (sub_Hiswu8fBBH)
- Le badge "Actif" 
- Les details des prelevements recurrents
