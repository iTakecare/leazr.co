

# Plan : Supprimer les doublons et désactiver l'auto-restauration

## Problème
L'auto-restauration s'est exécutée 4 fois (React StrictMode + re-renders), créant 4 factures par offre au lieu d'une seule. Il y a 17 offres × 4 = 68 factures au lieu de 17.

## Corrections

### 1. Migration SQL : supprimer les doublons
Pour chaque `offer_id` avec des doublons, garder la facture la plus ancienne (`MIN(created_at)`) et supprimer les autres :

```sql
DELETE FROM invoices 
WHERE invoice_type = 'purchase' 
AND id NOT IN (
  SELECT DISTINCT ON (offer_id) id 
  FROM invoices 
  WHERE invoice_type = 'purchase' 
  ORDER BY offer_id, created_at ASC
);
```

Ajouter ensuite une contrainte unique pour empêcher les doublons futurs :
```sql
CREATE UNIQUE INDEX idx_invoices_unique_offer ON invoices (offer_id) WHERE offer_id IS NOT NULL;
```

### 2. Supprimer l'auto-restauration dans `InvoicingPage.tsx`
- Retirer le `useEffect` d'auto-restauration (lignes 53-76)
- Retirer les states `isRestoring` et `restoredCount`
- Retirer les imports de `getOrphanedPurchaseOffers` et `restorePurchaseInvoices`

Les 17 factures sont déjà créées, plus besoin de ce mécanisme.

## Fichiers impactés

| Fichier | Modification |
|---|---|
| Migration SQL | Suppression doublons + index unique |
| `src/pages/InvoicingPage.tsx` | Suppression auto-restauration |

