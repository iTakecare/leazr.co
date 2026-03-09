

# Aligner la colonne Activité à gauche et retirer "environ"

## Modifications dans `src/components/offers/OffersTable.tsx`

### 1. Alignement à gauche (ligne 532)
Ajouter `text-left` à la classe de la cellule `<TableCell>`.

### 2. Retirer "environ" (ligne 541)
`formatDistanceToNow` avec la locale `fr` génère "il y a environ 2 heures". Pour retirer "environ", on appliquera un `.replace("environ ", "")` sur le résultat :

```tsx
formatDistanceToNow(new Date(offer.last_activity_at), { addSuffix: true, locale: fr })
  .replace("environ ", "")
```

Deux changements mineurs, un seul fichier.

