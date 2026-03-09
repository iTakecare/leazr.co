

# Fix: Aligner le texte de la colonne Activité à gauche

## Problème
La classe `text-left` est bien présente sur le `TableCell`, mais le composant `TableCell` dans `table.tsx` n'a pas de `text-left` par défaut dans son `cn()`. Le problème vient probablement du fait que le `<td>` hérite d'un alignement contextuel.

## Solution
Ajouter `text-left` directement dans le composant `TableCell` de `src/components/ui/table.tsx` comme valeur par défaut, **ou** (pour ne pas toucher aux autres composants comme demandé) forcer l'alignement avec `!text-left` (important) sur la cellule dans `OffersTable.tsx` ligne 532 pour écraser tout style hérité.

### Modification dans `src/components/offers/OffersTable.tsx` (ligne 532)
Remplacer `text-left` par `!text-left` pour forcer la priorité Tailwind :

```tsx
<TableCell className="text-[9px] py-2 hidden lg:table-cell text-muted-foreground whitespace-nowrap !text-left">
```

Un seul changement, un seul fichier.

