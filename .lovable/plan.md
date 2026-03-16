

# Fix: Métriques du dashboard client ne comptent pas les contrats en cours

## Problème
La fonction `fetchClientStats` dans `src/hooks/useClientData.ts` filtre les contrats avec `.eq('status', 'active')` uniquement. Or, un contrat peut être "en cours" avec d'autres statuts (`signed`, `contract_sent`, `equipment_ordered`, `delivered`). Le contrat visible dans la capture a le statut "Commandé" (`equipment_ordered`), donc il n'est pas compté — d'où les métriques à 0.

## Solution

### `src/hooks/useClientData.ts` — ligne 116

Remplacer `.eq('status', 'active')` par `.in('status', ['active', 'signed', 'contract_sent', 'equipment_ordered', 'delivered'])` pour inclure tous les contrats en cours dans le calcul de la mensualité totale, du nombre d'équipements actifs et du prochain renouvellement.

```typescript
// Avant
.eq('status', 'active');

// Après
.in('status', ['active', 'signed', 'contract_sent', 'equipment_ordered', 'delivered']);
```

Changement minime, un seul fichier, une seule ligne.

